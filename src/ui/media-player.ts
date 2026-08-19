import { setIcon } from 'obsidian';
import type { MediaSource, SceneMarker, SubtitleTrack, VideoVariant } from '../types';
import { formatTimecode, timeUrl } from '../utils/time';

export interface PlayerAdapter {
  canSeek(): boolean;
  seek(seconds: number): Promise<void> | void;
  getCurrentTime(): Promise<number> | number;
  getDuration(): Promise<number> | number;
  play(): Promise<void> | void;
  pause(): Promise<void> | void;
  isPlaying(): boolean;
  setRate(rate: number): void;
  requestFullscreen(): void;
  requestPiP(): Promise<void> | void;
  destroy(): void;
}

class Html5Adapter implements PlayerAdapter {
  constructor(private readonly video: HTMLVideoElement) {}
  canSeek(): boolean { return this.video.readyState > 0 || Number.isFinite(this.video.duration); }
  seek(seconds: number): void {
    const duration = Number.isFinite(this.video.duration) ? this.video.duration : Number.POSITIVE_INFINITY;
    this.video.currentTime = Math.max(0, Math.min(seconds, duration));
  }
  getCurrentTime(): number { return this.video.currentTime; }
  getDuration(): number { return this.video.duration; }
  play(): Promise<void> { return this.video.play(); }
  pause(): void { this.video.pause(); }
  isPlaying(): boolean { return !this.video.paused && !this.video.ended; }
  setRate(rate: number): void { this.video.playbackRate = rate; }
  requestFullscreen(): void { void this.video.requestFullscreen?.(); }
  requestPiP(): Promise<void> | void {
    const pip = (this.video as HTMLVideoElement & { requestPictureInPicture?: () => Promise<void> }).requestPictureInPicture;
    return pip ? pip.call(this.video) : undefined;
  }
  destroy(): void {}
}

function youtubeId(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) return parsed.pathname.slice(1);
    return parsed.searchParams.get('v') ??
      (parsed.pathname.startsWith('/shorts/') ? parsed.pathname.split('/')[2] : undefined);
  } catch {
    return undefined;
  }
}

export class MediaPlayer {
  private adapter: PlayerAdapter | undefined;
  private readonly root: HTMLElement;
  private readonly chaptersEl: HTMLElement;
  private video?: HTMLVideoElement;
  private progress?: HTMLInputElement;
  private timeLabel?: HTMLElement;
  private durationLabel?: HTMLElement;
  private playButton?: HTMLButtonElement;
  private lastSavedSecond = -1;

  constructor(
    parent: HTMLElement,
    private readonly source: MediaSource,
    private readonly scenes: SceneMarker[],
    private readonly onCapture: (seconds: number) => void,
    private readonly onProgress?: (positionSeconds: number, durationSeconds?: number, completed?: boolean) => void,
    private readonly initialPosition?: number,
  ) {
    this.root = parent.createDiv({ cls: 'pml-player' });
    this.chaptersEl = this.root.createDiv({ cls: 'pml-chapters' });
    this.renderSource();
    this.renderChapters();
  }

  private renderSource(): void {
    const url = this.source.url;
    if (this.source.videoVariants?.length || /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(url)) {
      this.renderHtml5(url, this.source.videoVariants ?? [], this.source.subtitleTracks ?? []);
      return;
    }

    const yt = youtubeId(url);
    if (yt) {
      const iframe = this.root.createEl('iframe', { cls: 'pml-video-frame' });
      const start = this.source.startSeconds !== undefined ? `&start=${Math.floor(this.source.startSeconds)}` : '';
      iframe.src = `https://www.youtube.com/embed/${encodeURIComponent(yt)}?enablejsapi=1&playsinline=1${start}`;
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture; web-share';
      iframe.setAttribute('allowfullscreen', 'true');
      this.addExternalSeekNotice('YouTube source: timestamp links are supported. Full in-player synchronization can use the official IFrame API.');
      this.renderExternalChapterButtons();
      return;
    }

    if (/vimeo\.com/i.test(url)) {
      const iframe = this.root.createEl('iframe', { cls: 'pml-video-frame' });
      const start = this.source.startSeconds !== undefined ? `#t=${Math.floor(this.source.startSeconds)}s` : '';
      iframe.src = `${url}${start}`;
      iframe.allow = 'autoplay; fullscreen; picture-in-picture';
      iframe.setAttribute('allowfullscreen', 'true');
      this.addExternalSeekNotice('Vimeo source: the Player SDK supports seeking, chapters, speed, quality, and text tracks. A future adapter can expose those controls natively.');
      this.renderExternalChapterButtons();
      return;
    }

    const iframe = this.root.createEl('iframe', { cls: 'pml-video-frame' });
    iframe.src = this.source.startSeconds !== undefined ? timeUrl(url, this.source.startSeconds) : url;
    iframe.setAttribute('allowfullscreen', 'true');
    this.addExternalSeekNotice('Generic source: controls depend on the website. Timestamp links are used where supported.');
    this.renderExternalChapterButtons();
  }

  private renderHtml5(url: string, variants: VideoVariant[], tracks: SubtitleTrack[]): void {
    const video = this.root.createEl('video', { cls: 'pml-video' });
    video.preload = 'metadata';
    video.playsInline = true;
    video.controls = false;
    video.setAttribute('aria-label', this.source.sourceTitle ?? this.source.label);
    this.video = video;
    this.adapter = new Html5Adapter(video);

    this.mountVariant(variants[0]?.url ?? url);
    for (const track of tracks) {
      const element = video.createEl('track');
      element.src = track.url;
      element.kind = track.kind ?? 'subtitles';
      element.label = track.label;
      element.srclang = track.language ?? '';
      element.default = false;
    }

    video.addEventListener('timeupdate', () => this.syncTimeline(false));
    video.addEventListener('loadedmetadata', () => {
      if (this.initialPosition !== undefined) this.adapter?.seek(this.initialPosition);
      else if (this.source.startSeconds !== undefined) this.adapter?.seek(this.source.startSeconds);
      this.syncTimeline(false);
    }, { once: true });
    video.addEventListener('ended', () => this.syncTimeline(true));
    this.renderControls(variants, tracks);
  }

  private mountVariant(url: string): void {
    if (!this.video) return;
    const current = Number.isFinite(this.video.currentTime) ? this.video.currentTime : 0;
    this.video.src = url;
    this.video.load();
    if (current > 0) {
      this.video.addEventListener('loadedmetadata', () => {
        this.video?.fastSeek?.(current);
      }, { once: true });
    }
  }

  private renderControls(variants: VideoVariant[], tracks: SubtitleTrack[]): void {
    const controls = this.root.createDiv({ cls: 'pml-player-ui' });
    const timeline = controls.createDiv({ cls: 'pml-timeline-row' });
    const progress = timeline.createEl('input', { cls: 'pml-progress', attr: { type: 'range', min: '0', max: '1000', step: '1', value: '0', 'aria-label': 'Seek video' } });
    this.progress = progress;
    progress.addEventListener('input', () => {
      const duration = Number(this.adapter?.getDuration());
      if (Number.isFinite(duration) && duration > 0) {
        this.adapter?.seek((Number(progress.value) / 1000) * duration);
      }
    });
    this.timeLabel = timeline.createSpan({ cls: 'pml-time-current', text: '0:00' });
    timeline.createSpan({ text: '/' });
    this.durationLabel = timeline.createSpan({ cls: 'pml-time-duration', text: '0:00' });

    const row = controls.createDiv({ cls: 'pml-control-row' });
    const playButton = row.createEl('button', { cls: 'pml-control-button', attr: { 'aria-label': 'Play' } });
    this.playButton = playButton;
    setIcon(playButton, 'play');
    playButton.addEventListener('click', () => this.togglePlay());

    this.makeSkipButton(row, -10, '10 seconds back');
    this.makeSkipButton(row, 10, '10 seconds forward');
    this.makeSkipButton(row, -30, '30 seconds back');
    this.makeSkipButton(row, 30, '30 seconds forward');

    const speed = row.createEl('select', { cls: 'pml-player-select', attr: { 'aria-label': 'Playback speed' } });
    for (const rate of [0.5, 0.75, 1, 1.25, 1.5, 2]) speed.createEl('option', { text: `${rate}×`, value: String(rate) });
    speed.value = '1';
    speed.addEventListener('change', () => this.adapter?.setRate(Number(speed.value)));

    if (variants.length > 1) {
      const quality = row.createEl('select', { cls: 'pml-player-select', attr: { 'aria-label': 'Video quality' } });
      for (const variant of variants) quality.createEl('option', { text: variant.label, value: variant.url });
      quality.addEventListener('change', () => this.mountVariant(quality.value));
    }

    if (tracks.length) {
      const subtitle = row.createEl('select', { cls: 'pml-player-select', attr: { 'aria-label': 'Subtitle track' } });
      subtitle.createEl('option', { text: 'CC off', value: '' });
      for (const track of tracks) subtitle.createEl('option', { text: track.label, value: track.label });
      subtitle.addEventListener('change', () => this.setSubtitle(subtitle.value));
    }

    const capture = row.createEl('button', { cls: 'pml-control-button', attr: { 'aria-label': 'Add scene at current time' } });
    setIcon(capture, 'bookmark-plus');
    capture.addEventListener('click', () => {
      const seconds = Number(this.adapter?.getCurrentTime());
      if (Number.isFinite(seconds)) this.onCapture(seconds);
    });

    const fullscreen = row.createEl('button', { cls: 'pml-control-button', attr: { 'aria-label': 'Fullscreen' } });
    setIcon(fullscreen, 'maximize');
    fullscreen.addEventListener('click', () => this.adapter?.requestFullscreen());

    const pip = row.createEl('button', { cls: 'pml-control-button', attr: { 'aria-label': 'Picture in picture' } });
    setIcon(pip, 'picture-in-picture');
    pip.addEventListener('click', () => { void this.adapter?.requestPiP(); });
  }

  private makeSkipButton(parent: HTMLElement, delta: number, label: string): void {
    const button = parent.createEl('button', { cls: 'pml-control-button', attr: { 'aria-label': label } });
    button.textContent = delta > 0 ? `+${delta}s` : `${delta}s`;
    button.addEventListener('click', () => {
      const current = Number(this.adapter?.getCurrentTime());
      if (Number.isFinite(current)) this.adapter?.seek(current + delta);
    });
  }

  private setSubtitle(label: string): void {
    if (!this.video) return;
    for (const track of Array.from(this.video.textTracks)) {
      track.mode = label && track.label === label ? 'showing' : 'disabled';
    }
  }

  private syncTimeline(completed: boolean): void {
    if (!this.adapter) return;
    const position = Number(this.adapter.getCurrentTime());
    const duration = Number(this.adapter.getDuration());
    if (this.progress && Number.isFinite(duration) && duration > 0 && Number.isFinite(position)) {
      this.progress.value = String(Math.round((position / duration) * 1000));
    }
    if (this.timeLabel && Number.isFinite(position)) this.timeLabel.textContent = formatTimecode(position);
    if (this.durationLabel && Number.isFinite(duration)) this.durationLabel.textContent = formatTimecode(duration);
    const second = Math.floor(position);
    if (completed || second !== this.lastSavedSecond) {
      this.lastSavedSecond = second;
      this.onProgress?.(Math.max(0, position), Number.isFinite(duration) ? duration : undefined, completed);
    }
  }

  private togglePlay(): void {
    if (!this.adapter || !this.playButton) return;
    if (this.adapter.isPlaying()) {
      this.adapter.pause();
      setIcon(this.playButton, 'play');
    } else {
      void this.adapter.play();
      setIcon(this.playButton, 'pause');
    }
  }

  private addExternalSeekNotice(message: string): void {
    this.root.createDiv({ cls: 'pml-player-note mod-muted', text: message });
  }

  private renderExternalChapterButtons(): void {
    if (!this.scenes.length) return;
    const row = this.root.createDiv({ cls: 'pml-external-chapters' });
    for (const scene of [...this.scenes].sort((a, b) => a.startSeconds - b.startSeconds)) {
      const button = row.createEl('button', { cls: 'pml-external-chapter', attr: { type: 'button' } });
      button.createSpan({ cls: 'pml-chapter-time', text: formatTimecode(scene.startSeconds) });
      button.createSpan({ text: scene.title });
      button.addEventListener('click', () => window.open(timeUrl(this.source.url, scene.startSeconds), '_blank', 'noopener,noreferrer'));
    }
  }

  private renderChapters(): void {
    this.chaptersEl.empty();
    if (!this.scenes.length) return;
    this.chaptersEl.createEl('div', { cls: 'pml-chapters-heading', text: 'Chapters and scenes' });
    for (const scene of [...this.scenes].sort((a, b) => a.startSeconds - b.startSeconds)) {
      const row = this.chaptersEl.createEl('button', { cls: 'pml-chapter', attr: { type: 'button' } });
      row.createSpan({ cls: 'pml-chapter-time', text: formatTimecode(scene.startSeconds) });
      row.createSpan({ text: scene.title });
      row.addEventListener('click', () => {
        if (this.adapter?.canSeek()) void this.adapter.seek(scene.startSeconds);
        else window.open(timeUrl(this.source.url, scene.startSeconds), '_blank', 'noopener,noreferrer');
      });
    }
  }

  destroy(): void {
    this.adapter?.destroy();
    this.root.remove();
  }
}

import type { MetadataProvider } from './types';
import { GenericProvider } from './generic';
import { MyAnimeListProvider } from './myanimelist';
import { MyDramaListProvider } from './mydramalist';
import { IMDbProvider } from './imdb';
import { VikiProvider } from './viki';
import { IQIYIProvider } from './iqiyi';
import { YouTubeProvider } from './youtube';
import { DoujinProvider } from './doujin';
import { MissAVProvider } from './missav';

export function createProviders(): MetadataProvider[] {
  return [
    new MyAnimeListProvider(),
    new MyDramaListProvider(),
    new IMDbProvider(),
    new VikiProvider(),
    new IQIYIProvider(),
    new YouTubeProvider(),
    new MissAVProvider(),
    new DoujinProvider(),
    new GenericProvider(),
  ];
}

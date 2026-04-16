'use client';

import { useState } from 'react';
import { Play, ExternalLink, AlertCircle } from 'lucide-react';

interface VideoResource {
  platform: 'bilibili' | 'youtube' | 'xigua' | 'custom';
  videoId: string;
  title?: string;
  thumbnailUrl?: string;
  duration?: number;
}

interface VideoPlayerProps {
  video: VideoResource;
  compact?: boolean;
}

function getEmbedUrl(video: VideoResource): string {
  switch (video.platform) {
    case 'bilibili':
      return `//player.bilibili.com/player.html?bvid=${video.videoId}&page=1&high_quality=1&danmaku=0`;
    case 'youtube':
      return `https://www.youtube.com/embed/${video.videoId}`;
    case 'xigua':
      return `//www.ixigua.com/iframe/${video.videoId}`;
    case 'custom':
      return video.videoId;
    default:
      return '';
  }
}

function getSourceUrl(video: VideoResource): string {
  switch (video.platform) {
    case 'bilibili':
      return `https://www.bilibili.com/video/${video.videoId}`;
    case 'youtube':
      return `https://www.youtube.com/watch?v=${video.videoId}`;
    case 'xigua':
      return `https://www.ixigua.com/${video.videoId}`;
    case 'custom':
      return video.videoId;
    default:
      return '#';
  }
}

function getPlatformLabel(platform: string): string {
  switch (platform) {
    case 'bilibili':
      return 'B站';
    case 'youtube':
      return 'YouTube';
    case 'xigua':
      return '西瓜视频';
    default:
      return '视频';
  }
}

function getPlatformColor(platform: string): string {
  switch (platform) {
    case 'bilibili':
      return 'bg-pink-100 text-pink-700';
    case 'youtube':
      return 'bg-red-100 text-red-700';
    case 'xigua':
      return 'bg-orange-100 text-orange-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export default function VideoPlayer({ video, compact = false }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  if (compact) {
    return (
      <a
        href={getSourceUrl(video)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Play className="w-4 h-4 text-orange-500 flex-shrink-0" />
        <span className="text-sm text-gray-700 truncate">{video.title || '观看教学视频'}</span>
        <span
          className={`text-xs px-1.5 py-0.5 rounded ${getPlatformColor(video.platform)} flex-shrink-0`}
        >
          {getPlatformLabel(video.platform)}
        </span>
        {video.duration && (
          <span className="text-xs text-gray-400 flex-shrink-0">
            {formatDuration(video.duration)}
          </span>
        )}
        <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0" />
      </a>
    );
  }

  if (!isPlaying) {
    return (
      <div className="w-full">
        {video.title && (
          <div className="flex items-center gap-2 mb-2">
            <Play className="w-4 h-4 text-orange-500" />
            <h4 className="text-sm font-medium text-gray-700">{video.title}</h4>
            <span className={`text-xs px-1.5 py-0.5 rounded ${getPlatformColor(video.platform)}`}>
              {getPlatformLabel(video.platform)}
            </span>
          </div>
        )}
        <button
          onClick={() => setIsPlaying(true)}
          className="relative w-full rounded-xl overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 group cursor-pointer"
          style={{ aspectRatio: '16/9' }}
        >
          {video.thumbnailUrl ? (
            <img
              src={video.thumbnailUrl}
              alt={video.title || '教学视频'}
              className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-white/30 transition-colors">
                  <Play className="w-8 h-8 text-white ml-1" />
                </div>
                <p className="text-white/80 text-sm">{getPlatformLabel(video.platform)} 教学视频</p>
                {video.duration && (
                  <p className="text-white/60 text-xs mt-1">{formatDuration(video.duration)}</p>
                )}
              </div>
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 bg-orange-500/90 rounded-full flex items-center justify-center shadow-lg group-hover:bg-orange-500 group-hover:scale-110 transition-all">
              <Play className="w-6 h-6 text-white ml-0.5" />
            </div>
          </div>
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
            <span className="text-xs bg-black/50 text-white px-2 py-0.5 rounded">
              {getPlatformLabel(video.platform)}
            </span>
            {video.duration && (
              <span className="text-xs bg-black/50 text-white px-2 py-0.5 rounded">
                {formatDuration(video.duration)}
              </span>
            )}
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {video.title && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-orange-500" />
            <h4 className="text-sm font-medium text-gray-700">{video.title}</h4>
          </div>
          <a
            href={getSourceUrl(video)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-orange-500 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />在{getPlatformLabel(video.platform)}打开
          </a>
        </div>
      )}
      <div
        className="relative w-full rounded-xl overflow-hidden bg-black"
        style={{ aspectRatio: '16/9' }}
      >
        <iframe
          src={getEmbedUrl(video)}
          scrolling="no"
          frameBorder="0"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
          title={video.title || '教学视频'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <AlertCircle className="w-3.5 h-3.5 text-gray-400" />
        <p className="text-xs text-gray-400">
          如视频无法播放，请点击上方链接在{getPlatformLabel(video.platform)}观看
        </p>
      </div>
    </div>
  );
}

export function VideoList({
  videos,
  compact = false,
}: {
  videos: VideoResource[];
  compact?: boolean;
}) {
  if (!videos || videos.length === 0) return null;

  return (
    <div className={`space-y-3 ${compact ? 'space-y-2' : ''}`}>
      {videos.map((video, idx) => (
        <VideoPlayer
          key={`${video.platform}-${video.videoId}-${idx}`}
          video={video}
          compact={compact}
        />
      ))}
    </div>
  );
}

export type { VideoResource };

export type RewardVideoSource =
  | { kind: 'file'; src: string }
  | { kind: 'youtube'; id: string; embedUrl: string }
  | { kind: 'vimeo'; id: string; embedUrl: string }
  | { kind: 'unsupported' }

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com', 'youtu.be'])
const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'])
const DIRECT_VIDEO_EXTENSIONS = /\.(mp4|webm|ogv|ogg)$/i

export function getRewardVideoSource(value: string): RewardVideoSource {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return { kind: 'unsupported' }
  }

  if (url.protocol !== 'https:') return { kind: 'unsupported' }
  const host = url.hostname.toLowerCase()
  const parts = url.pathname.split('/').filter(Boolean)

  if (YOUTUBE_HOSTS.has(host)) {
    let id: string | null = null
    if (host === 'youtu.be') id = parts[0] ?? null
    else if (url.pathname === '/watch') id = url.searchParams.get('v')
    else if (['embed', 'shorts', 'live', 'v'].includes(parts[0] ?? '')) id = parts[1] ?? null

    if (!id || !/^[A-Za-z0-9_-]{6,20}$/.test(id)) return { kind: 'unsupported' }
    return {
      kind: 'youtube',
      id,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}?enablejsapi=1&playsinline=1&controls=1&rel=0`,
    }
  }

  if (VIMEO_HOSTS.has(host)) {
    const videoIndex = parts[0] === 'video' ? 1 : 0
    const id = parts[videoIndex]
    if (!id || !/^\d{4,12}$/.test(id)) return { kind: 'unsupported' }
    const privacyHash = url.searchParams.get('h')
    const query = new URLSearchParams({ dnt: '1', title: '0', byline: '0', portrait: '0' })
    if (privacyHash && /^[A-Za-z0-9]+$/.test(privacyHash)) query.set('h', privacyHash)
    return { kind: 'vimeo', id, embedUrl: `https://player.vimeo.com/video/${id}?${query.toString()}` }
  }

  if (DIRECT_VIDEO_EXTENSIONS.test(url.pathname)) return { kind: 'file', src: url.toString() }
  return { kind: 'unsupported' }
}

export function isSupportedRewardVideoUrl(value: string): boolean {
  return getRewardVideoSource(value).kind !== 'unsupported'
}

# Synthetic crop videos

`crop-landscape.mp4` (320×180) and `crop-portrait.mp4` (180×320) are synthetic FFmpeg `testsrc2` patterns created for intrinsic crop regression tests. They contain no user media. To regenerate either file:

```sh
ffmpeg -f lavfi -i testsrc2=size=320x180:rate=12 -t 3 -c:v libx264 -pix_fmt yuv420p crop-landscape.mp4
ffmpeg -f lavfi -i testsrc2=size=180x320:rate=12 -t 3 -c:v libx264 -pix_fmt yuv420p crop-portrait.mp4
```

The browser tests consume the committed files and do not invoke FFmpeg.

# Synthetic last-frame videos

`last-frame-short.mp4` is a 0.3-second silent red→green test video.
`last-frame-audio.mp4` is a 6-second red→green test video with a synthetic 440 Hz tone.
Both are 160×90 H.264/YUV420p at 20 fps; the audio is AAC at 32 kb/s.
They contain no user data. Tests import these committed files through the normal
media picker, verify the final decoded green frame and sample the crossfade pixels.
The browser tests do not require FFmpeg.

# Synthetic crop videos

`crop-landscape.mp4` (320×180) and `crop-portrait.mp4` (180×320) are synthetic FFmpeg `testsrc2` patterns created for intrinsic crop regression tests. They contain no user media. To regenerate either file:

```sh
ffmpeg -f lavfi -i testsrc2=size=320x180:rate=12 -t 3 -c:v libx264 -pix_fmt yuv420p crop-landscape.mp4
ffmpeg -f lavfi -i testsrc2=size=180x320:rate=12 -t 3 -c:v libx264 -pix_fmt yuv420p crop-portrait.mp4
```

The browser tests consume the committed files and do not invoke FFmpeg.

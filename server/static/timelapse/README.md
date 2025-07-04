## Generating a Timelapse

The included script is only really tested on Linux and MacOS, though if you're clever it should be
adaptable for Windows as well.

1. Ensure that `ffmpeg` is installed. If it isn't, this can be installed through the terminal with your favorite package manager (brew, apt, etc.)
2. Run the bash script contained in this directory, from this directory. Please note that depending on the
   number of images present in your timelapse directory, this may take a some time to complete.

```bash
# Navigate to this directory
cd timelapse

# Run the script - you may need to modify permissions to make it executeable
chmod +x generate-timelapse.sh
./generate-timelapse.sh
```

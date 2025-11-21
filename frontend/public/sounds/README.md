# Call Ringtones

This directory contains audio files used for call ringtones in the application.

## Files

- `ringing.mp3` - Used for both incoming and outgoing call ringtones

## Testing Audio Playback

To test if the audio files are loading and playing correctly:

1. Open the application in your browser
2. Open the browser console (F12 or right-click → Inspect → Console)
3. Run the following command:
   ```javascript
   window.testCallAudio()
   ```

This will:
- Check if audio files are loaded
- Play the outgoing ringtone for 3 seconds
- Play the incoming ringtone for 3 seconds
- Log the results to the console

## Audio Requirements

- Format: MP3
- Loop: Yes (ringtones play continuously until stopped)
- Preload: Auto (files are preloaded when the app loads)

## Troubleshooting

If audio doesn't play:

1. **Check browser autoplay policy**: Some browsers block autoplay. User interaction may be required first.
2. **Check file path**: Ensure the file exists at `/sounds/ringing.mp3`
3. **Check file format**: Ensure the file is a valid MP3
4. **Check console**: Look for error messages in the browser console
5. **Check volume**: Ensure system and browser volume are not muted

## Browser Console Logs

When audio is working correctly, you should see:
```
[Call] Initializing audio elements
[Call] Outgoing ringtone loaded successfully
[Call] Incoming ringtone loaded successfully
[Call] Audio initialization status: { outgoingLoaded: true, incomingLoaded: true, ... }
```

If there are errors, you'll see detailed error information including:
- Error name and message
- Audio source URL
- Network state
- Ready state

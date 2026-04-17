Use this from PowerShell after opening a new terminal.

From workspace root:

```powershell
# 1) Start Expo Go server
cd C:\Users\Prem Sagar\Downloads\Sortt
pnpm dev:mobile
```

Open the Expo Go app on the Android device, make sure the phone is on the same Wi-Fi network, then scan the QR code shown in the terminal.

Important: scan from inside the Expo Go app scanner, not from the phone camera app.

If the QR banner is delayed but Metro is running, open Expo Go and enter this URL manually:

exp://192.168.1.100:8081

If the Expo Go app is not installed, install it from the Play Store first, then rerun the command above.

Keep this as the normal workflow. If you want the development build flow later, ask and I will switch it back.
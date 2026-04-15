Use this from PowerShell after opening a new terminal.

From workspace root:

```powershell
# 1) Start Metro dev server
cd C:\Users\Prem Sagar\Downloads\Sortt\apps\mobile
pnpm exec expo start --dev-client --localhost --port 8081
```

In a second terminal (keep Metro running in first terminal):

```powershell
# 2) Connect USB device to Metro port
$adb = "C:\Users\Prem Sagar\AppData\Local\Android\Sdk\platform-tools\adb.exe"
& $adb reverse --remove-all
& $adb reverse tcp:8081 tcp:8081

# 3) Open app on device
& $adb shell am start -a android.intent.action.VIEW -d "exp+sortt-mobile://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081"
```

If app is not installed, run once:

```powershell
cd C:\Users\Prem Sagar\Downloads\Sortt\apps\mobile
pnpm exec expo run:android --no-bundler
```

Then keep using only the first two blocks for normal daily reruns.

Try untill the app opens.
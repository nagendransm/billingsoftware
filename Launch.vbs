Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)

' 1. Start Node backend server in background (0 = completely hidden, NO console window)
WshShell.CurrentDirectory = currentDir
WshShell.Run "node server/index.js", 0, False

' 2. Wait 1.5 seconds for server to initialize
WScript.Sleep 1500

' 3. Find Edge executable
edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
If Not fso.FileExists(edgePath) Then
    edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
End If

' 4. Launch standalone Desktop Application Window (No address bar, no tabs, full desktop app)
If fso.FileExists(edgePath) Then
    WshShell.Run """" & edgePath & """ --app=http://localhost:5000 --window-size=1440,900", 1, False
Else
    WshShell.Run "http://localhost:5000", 1, False
End If

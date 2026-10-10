const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const desktopPath = path.join(process.env.USERPROFILE, 'Desktop');
const oldShortcutPath = path.join(desktopPath, 'Tamil Nadu Grocery Billing.lnk');
if (fs.existsSync(oldShortcutPath)) {
  try { fs.unlinkSync(oldShortcutPath); } catch (e) {}
}
const shortcutPath = path.join(desktopPath, 'Billr.lnk');
const vbsLauncher = path.join(__dirname, 'Launch.vbs');
const iconPath = path.join(__dirname, 'app.ico');

const vbsScript = `
Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = "${shortcutPath.replace(/\\/g, '\\\\')}"
Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = "C:\\\\Windows\\\\System32\\\\wscript.exe"
oLink.Arguments = """${vbsLauncher.replace(/\\/g, '\\\\')}"""
oLink.WorkingDirectory = "${__dirname.replace(/\\/g, '\\\\')}"
oLink.IconLocation = "${iconPath.replace(/\\/g, '\\\\')}"
oLink.WindowStyle = 1
oLink.Description = "Billr - Retail POS Billing Software"
oLink.Save
`;

const tempVbs = path.join(__dirname, 'temp_shortcut.vbs');
fs.writeFileSync(tempVbs, vbsScript);
execSync(`cscript //nologo "${tempVbs}"`);
fs.unlinkSync(tempVbs);
console.log('Desktop shortcut updated successfully at:', shortcutPath);

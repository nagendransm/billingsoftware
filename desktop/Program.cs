using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

namespace Billr
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            
            // Check for standalone independent executable in Billr folder
            string standaloneExe = Path.Combine(appDir, "Billr", "Billr.exe");
            if (File.Exists(standaloneExe))
            {
                try
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = standaloneExe;
                    psi.WorkingDirectory = Path.GetDirectoryName(standaloneExe);
                    psi.UseShellExecute = true;
                    Process.Start(psi);
                    return;
                }
                catch (Exception ex)
                {
                    MessageBox.Show("Error launching standalone software:\n" + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }
            }

            MessageBox.Show("Standalone package not found at:\n" + standaloneExe, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}

using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        string root = AppDomain.CurrentDomain.BaseDirectory;
        string page = Path.Combine(root, "dist", "index.html");
        if (!File.Exists(page))
        {
            MessageBox.Show(
                "No se encontró dist\\index.html. Mantenga la carpeta dist junto al ejecutable.",
                "Calculadora de ajustes ISO",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error
            );
            return;
        }

        try
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = page,
                UseShellExecute = true
            });
        }
        catch (Exception error)
        {
            MessageBox.Show(
                "No fue posible abrir el navegador.\n\n" + error.Message,
                "Calculadora de ajustes ISO",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error
            );
        }
    }
}

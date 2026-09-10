# Calculadora de ajustes con referencia a ISO 286

Aplicación web independiente para calcular límites dimensionales, juego o interferencia y visualizar campos de tolerancia. Funciona en GitHub Pages o sin conexión desde los archivos locales; no necesita Excel ni dependencias de ejecución.

## Uso en Windows

1. Mantenga `Calculadora Ajustes ISO.exe` y la carpeta `dist` en el mismo directorio.
2. Abra `Calculadora Ajustes ISO.exe`.
3. La herramienta se abrirá en el navegador predeterminado.

También puede abrir directamente `dist/index.html`.

## Estructura

- `dist/`: aplicación HTML, estilos, cálculo y datos locales.
- `.github/workflows/pages.yml`: publicación automática de `dist/` en GitHub Pages.
- `launcher/Program.cs`: código fuente del lanzador de Windows.
- `build-exe.ps1`: recompila el ejecutable en Windows.
- `tests/engine.test.cjs`: pruebas de regresión del motor de cálculo.
- `LEGAL-NOTICE.md`: consideraciones antes de publicar el proyecto.

## Desarrollo y comprobación

No requiere dependencias. Para ejecutar las pruebas con Node.js:

```powershell
node tests/engine.test.cjs
```

Para regenerar el ejecutable:

```powershell
powershell -ExecutionPolicy Bypass -File .\build-exe.ps1
```

## Alcance técnico

- Diámetros nominales mayores que 0 y hasta 3150 mm.
- Subconjunto de grados IT1 a IT14.
- Zonas D, E, F, G, H, JS, K, M, N, P, R, S, T y U.
- La zona T comienza por encima de 24 mm.
- IT14 no debe utilizarse hasta 1 mm; tampoco los agujeros N9–N14 en ese intervalo.
- Se contemplan las reglas especiales de agujeros N9–N14 para 3 < D ≤ 500 mm y M6 para 250 < D ≤ 315 mm.
- La rugosidad mostrada es una orientación independiente y no es un resultado de ISO 286.

La suite recorre los límites de todos los intervalos de diámetro y las zonas/grados implementados, además de casos de referencia y restricciones conocidas.

Los resultados deben contrastarse con la publicación oficial vigente antes de usarlos para fabricación, inspección o aceptación contractual. El proyecto no está afiliado ni certificado por ISO.

## Publicación

Cada actualización de la rama `main` despliega el contenido de `dist/` en GitHub Pages mediante GitHub Actions. En el repositorio, seleccione **Settings → Pages → Source: GitHub Actions** si la fuente no se activa automáticamente.

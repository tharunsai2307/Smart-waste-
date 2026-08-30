@echo off
echo Building Smart Waste Management Backend Server...
python -c "import subprocess, glob; files = [f for f in glob.glob('src/*.c') if 'migrate' not in f and f not in ('src/main.c', 'src/main.c.bak')]; subprocess.run(['gcc', '-Iinclude', '-o', 'server.exe'] + files + ['-lws2_32'])"
if %ERRORLEVEL% EQU 0 (
    echo Build successful.
) else (
    echo Build failed.
)
pause

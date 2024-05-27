@echo off
setlocal enabledelayedexpansion

set "filename=Fooocus\fooocus_version.py"
set "search=version ="

for /f "tokens=2 delims=''" %%a in ('findstr /c:"%search%" %filename%') do (
  set "version=%%a"

for /F "tokens=2 delims=:" %%i in ('"ipconfig | findstr "IPv4 ��ַ""') do SET LOCAL_IP=%%i

)

echo.
echo ------------------ ͼ�����ɹ��� Fooocus ������ by xhox ------------------
echo.
echo �汾Ҫ�� 2.1.780 �����ϣ������ļ�Ҫ�󣺷����ĵ� Fooocus\language\cn.json��Windows10���ϣ����İ汾
echo.
echo ��2.1.817 �汾��֧��ͨ���޸Ľű���������л���ǳ���⣬ --theme dark�� --theme light��
echo.
echo ��Ŀǰ�� Fooocus �汾��Ϊ��%version% ����ľ����� IP ��ַ�ǣ�%LOCAL_IP%
echo.
echo -----------------------------------------------------------------
echo.
echo ��� 1. �Զ����£����� Ĭ��Ԥ�裬Ӣ�Ľ��棬ǳɫ����
echo.
echo ��� 2. �Զ����£����� Ĭ��Ԥ�裬���Ľ��棬��ɫ����
echo.
echo ----------------------------------------
echo.
echo ��� 3. ���ø��£����� Ĭ��Ԥ�裬Ӣ�Ľ��棬ǳɫ����
echo.
echo ��� 4. ���ø��£����� Ĭ��Ԥ�裬���Ľ��棬��ɫ���⣬ʹ�ñ��� 127.0.0.1 ����
echo.
echo ��� 5. ���ø��£����� Ĭ��Ԥ�裬���Ľ��棬��ɫ���⣬���� ������ ���ʣ�ʹ�� huggingface��������վ ����ģ��
echo.
echo ��� 6. ���ø��£����� Ĭ��Ԥ�裬���Ľ��棬��ɫ���⣬���� ���� ����(ʹ��gradio��ʱ����)��ʹ�� huggingface��������վ ����ģ��
echo.
echo -----------------------------------------------------------------
echo.
echo ��������������ı�ţ���10����û�����룬Ĭ��ִ�б��5��

choice /t 10 /d 5 /c 123456 >nul
if errorlevel 255 (
    set num=5
) else (
    set num=%errorlevel%
)

if "%num%"=="1" (
    .\python_embeded\python.exe -s Fooocus\entry_with_update.py --language en --theme light
    pause
) else if "%num%"=="2" (
    .\python_embeded\python.exe -s Fooocus\entry_with_update.py --language cn --theme dark
    pause
) else if "%num%"=="3" (
    .\python_embeded\python.exe -s Fooocus\launch.py --language en --theme light
    pause
) else if "%num%"=="4" (
    .\python_embeded\python.exe -s Fooocus\launch.py --language cn --theme dark
    pause
) else if "%num%"=="5" (
    .\python_embeded\python.exe -s Fooocus\launch.py --language cn --theme dark --listen %LOCAL_IP% --port 7890 --hf-mirror https://hf-mirror.com/
    pause
) else if "%num%"=="6" (
    .\python_embeded\python.exe -s Fooocus\launch.py --language cn --theme dark --share --hf-mirror https://hf-mirror.com/
    pause
) else (
    echo ����ı����Ч
)

endlocal
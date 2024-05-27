@echo off
setlocal enabledelayedexpansion

set "filename=Fooocus\fooocus_version.py"
set "search=version ="

for /f "tokens=2 delims=''" %%a in ('findstr /c:"%search%" %filename%') do (
  set "version=%%a"

for /F "tokens=2 delims=:" %%i in ('"ipconfig | findstr "IPv4 地址""') do SET LOCAL_IP=%%i

)

echo.
echo ------------------ 图像生成工具 Fooocus 启动器 by xhox ------------------
echo.
echo 版本要求 2.1.780 及以上，额外文件要求：翻译文档 Fooocus\language\cn.json，Windows10以上，中文版本
echo.
echo （2.1.817 版本起，支持通过修改脚本代码参数切换深浅主题， --theme dark， --theme light）
echo.
echo 你目前的 Fooocus 版本号为：%version% ，你的局域网 IP 地址是：%LOCAL_IP%
echo.
echo -----------------------------------------------------------------
echo.
echo 编号 1. 自动更新，启动 默认预设，英文界面，浅色主题
echo.
echo 编号 2. 自动更新，启动 默认预设，中文界面，深色主题
echo.
echo ----------------------------------------
echo.
echo 编号 3. 禁用更新，启动 默认预设，英文界面，浅色主题
echo.
echo 编号 4. 禁用更新，启动 默认预设，中文界面，深色主题，使用本地 127.0.0.1 访问
echo.
echo 编号 5. 禁用更新，启动 默认预设，中文界面，深色主题，允许 局域网 访问，使用 huggingface抱脸镜像站 下载模型
echo.
echo 编号 6. 禁用更新，启动 默认预设，中文界面，深色主题，允许 公网 访问(使用gradio临时域名)，使用 huggingface抱脸镜像站 下载模型
echo.
echo -----------------------------------------------------------------
echo.
echo 请输入启动命令的编号：（10秒内没有输入，默认执行编号5）

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
    echo 输入的编号无效
)

endlocal
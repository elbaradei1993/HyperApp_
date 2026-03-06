@echo off
echo Updating Android launcher icons...

REM Create mipmap directories if they don't exist
if not exist "android\app\src\main\res\mipmap-mdpi" mkdir "android\app\src\main\res\mipmap-mdpi"
if not exist "android\app\src\main\res\mipmap-hdpi" mkdir "android\app\src\main\res\mipmap-hdpi"
if not exist "android\app\src\main\res\mipmap-xhdpi" mkdir "android\app\src\main\res\mipmap-xhdpi"
if not exist "android\app\src\main\res\mipmap-xxhdpi" mkdir "android\app\src\main\res\mipmap-xxhdpi"
if not exist "android\app\src\main\res\mipmap-xxxhdpi" mkdir "android\app\src\main\res\mipmap-xxxhdpi"

REM Copy favicon to correct mipmap folders for different densities
copy "ImageSets\android\drawable-mdpi\favicon.png" "android\app\src\main\res\mipmap-mdpi\ic_launcher.png"
copy "ImageSets\android\drawable-mdpi\favicon.png" "android\app\src\main\res\mipmap-mdpi\ic_launcher_foreground.png"
copy "ImageSets\android\drawable-hdpi\favicon.png" "android\app\src\main\res\mipmap-hdpi\ic_launcher.png"
copy "ImageSets\android\drawable-hdpi\favicon.png" "android\app\src\main\res\mipmap-hdpi\ic_launcher_foreground.png"
copy "ImageSets\android\drawable-xhdpi\favicon.png" "android\app\src\main\res\mipmap-xhdpi\ic_launcher.png"
copy "ImageSets\android\drawable-xhdpi\favicon.png" "android\app\src\main\res\mipmap-xhdpi\ic_launcher_foreground.png"
copy "ImageSets\android\drawable-xxhdpi\favicon.png" "android\app\src\main\res\mipmap-xxhdpi\ic_launcher.png"
copy "ImageSets\android\drawable-xxhdpi\favicon.png" "android\app\src\main\res\mipmap-xxhdpi\ic_launcher_foreground.png"
copy "ImageSets\android\drawable-xxxhdpi\favicon.png" "android\app\src\main\res\mipmap-xxxhdpi\ic_launcher.png"
copy "ImageSets\android\drawable-xxxhdpi\favicon.png" "android\app\src\main\res\mipmap-xxxhdpi\ic_launcher_foreground.png"

REM Also copy to drawable folder for adaptive icon reference
copy "ImageSets\android\drawable-xxxhdpi\favicon.png" "android\app\src\main\res\drawable\favicon.png"

echo Icon update completed!
pause

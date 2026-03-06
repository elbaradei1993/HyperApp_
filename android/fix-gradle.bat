@echo off
echo Setting GRADLE_USER_HOME environment variable...
setx GRADLE_USER_HOME "E:\GradleCache"
echo.
echo GRADLE_USER_HOME has been set to:
echo %GRADLE_USER_HOME%
echo.
echo If the directory above shows "E:\GradleCache", then the fix worked!
echo.
echo You can now close this window and try Android Studio again.
pause

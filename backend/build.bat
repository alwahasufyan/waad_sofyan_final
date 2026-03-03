@echo off
echo Starting Build...
call C:\Maven\bin\mvn.cmd clean install -DskipTests
echo Build Process Finished with errorlevel %errorlevel%
exit /b %errorlevel%

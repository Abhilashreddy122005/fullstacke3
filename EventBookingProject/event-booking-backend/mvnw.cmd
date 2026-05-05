@REM ----------------------------------------------------------------------------
@REM Maven Wrapper startup batch script
@REM ----------------------------------------------------------------------------
@IF "%__MVNW_ARG0_NAME__%"=="" (SET "MVN_CMD=mvn.cmd") ELSE (SET "MVN_CMD=%__MVNW_ARG0_NAME__%")
@SET MAVEN_PROJECTBASEDIR=%~dp0

@SET MAVEN_OPTS=%MAVEN_OPTS% -Xms256m -Xmx512m

@rem Find Java
@IF NOT "%JAVA_HOME%"=="" (
  @SET "JAVA_CMD=%JAVA_HOME%\bin\java.exe"
) ELSE (
  @IF EXIST "C:\java\oracleJdk-25\bin\java.exe" (
    @SET "JAVA_HOME=C:\java\oracleJdk-25"
    @SET "JAVA_CMD=C:\java\oracleJdk-25\bin\java.exe"
  ) ELSE (
    @SET "JAVA_CMD=java"
  )
)

@SET DOWNLOAD_URL=https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.6/apache-maven-3.9.6-bin.zip
@SET MAVEN_HOME=%USERPROFILE%\.mvn\wrapper\apache-maven-3.9.6

@IF NOT EXIST "%MAVEN_HOME%\bin\mvn.cmd" (
  @echo [EventSphere] Maven not found. Downloading Maven 3.9.6... please wait...
  @IF NOT EXIST "%USERPROFILE%\.mvn\wrapper" MKDIR "%USERPROFILE%\.mvn\wrapper"
  @powershell -Command "Invoke-WebRequest -Uri '%DOWNLOAD_URL%' -OutFile '%USERPROFILE%\.mvn\wrapper\maven.zip' -UseBasicParsing"
  @powershell -Command "Expand-Archive -Path '%USERPROFILE%\.mvn\wrapper\maven.zip' -DestinationPath '%USERPROFILE%\.mvn\wrapper' -Force"
  @del "%USERPROFILE%\.mvn\wrapper\maven.zip"
  @echo [EventSphere] Maven downloaded successfully!
)

@SET "PATH=%MAVEN_HOME%\bin;%PATH%"
@SET "MVN_EXEC=%MAVEN_HOME%\bin\mvn.cmd"

@"%MVN_EXEC%" %*

#!/bin/bash
# Try to find Java 17, fallback to default
if [ -d "$(pwd)/tools/amazon-corretto-17.jdk/Contents/Home" ]; then
    export JAVA_HOME=$(pwd)/tools/amazon-corretto-17.jdk/Contents/Home
elif [ -x "/usr/libexec/java_home" ]; then
    export JAVA_HOME=$(/usr/libexec/java_home -v 17 2>/dev/null)
    if [ -z "$JAVA_HOME" ]; then
        export JAVA_HOME=$(/usr/libexec/java_home)
    fi
else
    echo "Could not find JAVA_HOME"
    exit 1
fi

export PATH=$JAVA_HOME/bin:$PATH
export M2_HOME=$(pwd)/tools/apache-maven-3.9.6
export PATH=$M2_HOME/bin:$PATH

# Check if port 8080 is in use and kill the process
PID=$(lsof -ti:8080)
if [ ! -z "$PID" ]; then
  echo "Port 8080 is in use by PID $PID. Killing it..."
  kill -9 $PID
fi

echo "Starting Backend with Java: $(java -version 2>&1 | head -n 1)"
echo "Using Maven: $(mvn -v | head -n 1)"

# Change to the directory where the script is located to find pom.xml
cd "$(dirname "$0")" || exit

# Force dev profile and datasource URL to localhost
mvn spring-boot:run \
  -Dspring-boot.run.profiles=dev \
  -Dspring-boot.run.jvmArguments="-Dspring.datasource.url=jdbc:mysql://127.0.0.1:3307/supplypro?useSSL=false&allowPublicKeyRetrieval=true&useUnicode=true&characterEncoding=utf-8 -Dspring.datasource.username=root -Dspring.datasource.password=password"

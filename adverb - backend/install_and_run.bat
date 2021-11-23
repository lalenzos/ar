@ECHO OFF

:: check if Python is installed
ECHO Checking if python is installed

python --version
if errorlevel 1 goto errorNoPython
ECHO Python is installed...

:: check version
ECHO Checking Python version...
FOR /F %%A IN ('python versioncheck.py') DO SET "_PythonVersionOK=%%A"

IF "%_PythonVersionOK%"=="True" (
    ECHO Python version >= 3.6
) ELSE (
    ECHO Python version < 3.6
    ECHO Please install Python >= 3.6
    start https://www.python.org/downloads/
    PAUSE
    EXIT
)

:: virtual environment
ECHO Creating virtual environment...
python -m venv adverb-venv
ECHO Virtual environment created...
ECHO Activating virtual environment...
adverb-venv\Scripts\activate.bat
ECHO Virtual environment activated...

:: install dependencies
ECHO Installing Dependencies...
@pip install -r requirements.txt > nul
ECHO Dependencies installed...

:: install pytorch
::ECHO Installing PyTorch...
::@pip3 install torch===1.3.1 torchvision===0.4.2 -f https://download.pytorch.org/whl/torch_stable.html > nul
::ECHO PyTorch installed...

:: start server
ECHO Starting API-Server...
python webservice.py

goto :eof

errorNoPython:
ECHO.
ECHO Error^: Python not installed
ECHO Install Python and add it to the PATH environment variable
start https://www.python.org/downloads/

PAUSE
!include LogicLib.nsh

!macro customCheckAppRunning
  !ifdef BUILD_UNINSTALLER
    Call un.ensureTargetDirectoryIsNotRunning
  !else
    Call ensureTargetDirectoryIsNotRunning
  !endif
!macroend

!ifndef BUILD_UNINSTALLER
  Function ensureTargetDirectoryIsNotRunning
    IfFileExists "$INSTDIR\${PRODUCT_FILENAME}.exe" 0 done

    retryTargetDirectoryCheck:
      ClearErrors
      Rename "$INSTDIR\${PRODUCT_FILENAME}.exe" "$INSTDIR\${PRODUCT_FILENAME}.exe.update-check"
      IfErrors targetDirectoryBlocked targetDirectoryReady

    targetDirectoryReady:
      Rename "$INSTDIR\${PRODUCT_FILENAME}.exe.update-check" "$INSTDIR\${PRODUCT_FILENAME}.exe"
      Goto done

    targetDirectoryBlocked:
      MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "请先关闭这个安装目录中的 d2-tools，再继续安装。$\r$\n$\r$\n目录：$INSTDIR" /SD IDCANCEL IDRETRY retryTargetDirectoryCheck
      Quit

    done:
  FunctionEnd
!endif

!ifdef BUILD_UNINSTALLER
  Function un.ensureTargetDirectoryIsNotRunning
    IfFileExists "$INSTDIR\${PRODUCT_FILENAME}.exe" 0 done

    retryTargetDirectoryCheck:
      ClearErrors
      Rename "$INSTDIR\${PRODUCT_FILENAME}.exe" "$INSTDIR\${PRODUCT_FILENAME}.exe.update-check"
      IfErrors targetDirectoryBlocked targetDirectoryReady

    targetDirectoryReady:
      Rename "$INSTDIR\${PRODUCT_FILENAME}.exe.update-check" "$INSTDIR\${PRODUCT_FILENAME}.exe"
      Goto done

    targetDirectoryBlocked:
      MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "请先关闭这个安装目录中的 d2-tools，再继续安装。$\r$\n$\r$\n目录：$INSTDIR" /SD IDCANCEL IDRETRY retryTargetDirectoryCheck
      Quit

    done:
  FunctionEnd
!endif

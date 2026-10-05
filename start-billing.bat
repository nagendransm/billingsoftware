@echo off
title Tamil Nadu Grocery GST Billing System - தமிழ் & English
color 0A
echo =========================================================================
echo    TAMIL NADU GROCERY GST COMPLIANT BILLING SOFTWARE (மளிகை கடை பில்லிங்)
echo =========================================================================
echo  Starting server at http://localhost:5000 ...
echo  State: 33 - Tamil Nadu (CGST + SGST compliant)
echo  Press Ctrl+C to stop the billing software.
echo =========================================================================

start "" http://localhost:5000
node server/index.js
pause

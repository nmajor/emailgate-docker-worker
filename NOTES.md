http://www2.warwick.ac.uk/fac/sci/statistics/staff/academic-research/firth/software/pdfjam/
http://manpages.ubuntu.com/manpages/precise/man1/pdfjam.1.html


// const latexTemplate = '\\\\documentclass[]{book}\\\\usepackage[utf8]{inputenc}\\\\usepackage[english]{babel}\\\\usepackage{pdfpages}\\\\usepackage{fancyhdr}\\\\usepackage[right=0in,left=0in]{geometry}\\\\setlength{\\\\footskip}{95pt}\\\\pagestyle{fancy}\\\\fancyhf{}\\\\renewcommand{\\\\headrulewidth}{0pt}\\\\setcounter{page}{STARTING_PAGE}\\\\fancyfoot[FOOTER_POSITIONS]{\\\\thepage}\\\\begin{document}\\\\includepdf[pages=-,pagecommand=\\\\thispagestyle{fancy}]{PDF_PATH}\\\\end{document}'; // eslint-disable-line




### TODO:

[DONE] Remove the status logging.
[DONE] Add percentage progress updating.
[DONE] Clean up the pdf files after task is complete.
Make it so if a page or email is missing its pdf or the pdf is out of date then the code with run the Plan to build the pdf before continueing on or throwing an error.

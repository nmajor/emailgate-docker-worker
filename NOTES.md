http://www2.warwick.ac.uk/fac/sci/statistics/staff/academic-research/firth/software/pdfjam/
http://manpages.ubuntu.com/manpages/precise/man1/pdfjam.1.html


// const latexTemplate = '\\\\documentclass[]{book}\\\\usepackage[utf8]{inputenc}\\\\usepackage[english]{babel}\\\\usepackage{pdfpages}\\\\usepackage{fancyhdr}\\\\usepackage[right=0in,left=0in]{geometry}\\\\setlength{\\\\footskip}{95pt}\\\\pagestyle{fancy}\\\\fancyhf{}\\\\renewcommand{\\\\headrulewidth}{0pt}\\\\setcounter{page}{STARTING_PAGE}\\\\fancyfoot[FOOTER_POSITIONS]{\\\\thepage}\\\\begin{document}\\\\includepdf[pages=-,pagecommand=\\\\thispagestyle{fancy}]{PDF_PATH}\\\\end{document}'; // eslint-disable-line




### TODO:

[DONE] Remove the status logging.
[DONE] Add percentage progress updating.
[DONE] Clean up the pdf files after task is complete.
Make it so if a page or email is missing its pdf or the pdf is out of date then the code with run the Plan to build the pdf before continueing on or throwing an error.




pdftk /tmp/compilation/email-rkSWyTl300Z-paged.pdf /tmp/compilation/email-ByugJ6xhR0Z-paged.pdf /tmp/compilation/email-ryQJ6e30R--paged.pdf /tmp/compilation/email-S1-16l2AC--paged.pdf /tmp/compilation/email-rJGKjxn0R--paged.pdf /tmp/compilation/email-r1qEol2RRZ-paged.pdf /tmp/compilation/email-HJxgog3CRZ-paged.pdf /tmp/compilation/email-BJBC5xhCC--paged.pdf /tmp/compilation/email-rJfsvehACW-paged.pdf /tmp/compilation/email-rkqKPxnCAZ-paged.pdf cat output newFilename /tmp/combined.pdf


echo "\\\\documentclass[twoside]{book}\n\n\\usepackage[utf8]{inputenc}\n\\usepackage[english]{babel}\n\\usepackage{pdfpages}\n\\usepackage[papersize={6in,9in}]{geometry}\n\n\\begin{document}\n\\includepdf[pages=-,fitpaper=true,offset=2mm 2mm]{/tmp/compilation/compilation-S1qKd-3AZ.pdf}\n\\end{document}\n" | pdflatex -jobname="compilation-S1qKd-3AZ-guttered" -output-directory="/tmp/compilation"


pdflatex yourfile.tex -jobname="compilation-S1qKd-3AZ-guttered" -output-directory="/tmp/compilation"



# DEBUGGING:

Get the task hash from the emailgate server.

Replace the task from the .env file then run:

    $ docker run -t -i -v /Users/nmajor/dev/tmp/:/var/host -m 2058 --env-file ./.env emailgate-worker /bin/bash

Once inside the docker container run

    node dist/index.js

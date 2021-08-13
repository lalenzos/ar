# virtual-document README

This demo extension gets activated, when a file is of type *.java. Once the extension gets executed by using the command "Show Adverb", in a new virtual document the orginal java-code gets displayed, except that all lines starting with a comment are skipped and the following words/commands are replaced by something differently:
- the word "public" gets completely removed
- the command "System.out.println" gets replaced by "sout"
- the word "return" gets replaced by "rtn"


## Running the sample

- `npm install`
- open the file `src/extension.ts`, press `F5` to run the extension
- open the example java-file from the folder `example`
- execute the command `Show Adverb` from the command palette or click on the button `Show Adverb` in the righ upper corner (navigation)
let pyodide = null;

const editor = {
    async init() {
        this.editor = document.querySelector('.code-input');
        this.output = document.querySelector('.code-output code');
        this.consoleOutput = document.querySelector('.console-output');
        this.runButton = document.querySelector('.run-button');
        this.clearButton = document.querySelector('.clear-console');
        this.languageSelect = document.querySelector('.language');

        // Initialize Python environment
        try {
            this.logToConsole("Loading Python environment...");
            pyodide = await loadPyodide({
                stdout: (text) => this.logToConsole(text),
                stderr: (text) => this.logToConsole(text, "error")
            });
            this.logToConsole("Python environment ready!", "result");
        } catch (err) {
            this.logToConsole("Failed to load Python environment: " + err.message, "error");
        }

        this.setupEventListeners();
        this.setDefaultCode();
    },

    setDefaultCode() {
        const defaultJS = `// JavaScript Example
function calculateSum(n) {
    return Array.from({length: n}, (_, i) => i + 1)
                .reduce((sum, num) => sum + num, 0);
}

console.log("Sum of first 10 numbers:", calculateSum(10));`;

        const defaultPython = `# Python Example
def calculate_sum(n):
    total = 0
    for i in range(1, n + 1):
        total += i
    return total

print("Sum of first 10 numbers:", calculate_sum(10))`;

        this.editor.value = this.languageSelect.value === 'python' ? defaultPython : defaultJS;
        this.updateOutput();
        this.updateLineNumbers();
    },

    setupEventListeners() {
        this.runButton.addEventListener('click', () => this.runCode());
        this.clearButton.addEventListener('click', () => {
            this.consoleOutput.innerHTML = '';
        });

        this.editor.addEventListener('input', () => {
            this.updateOutput();
            this.updateLineNumbers();
        });

        this.languageSelect.addEventListener('change', () => {
            this.setDefaultCode();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.runCode();
            }
        });
    },

    updateOutput() {
        this.output.textContent = this.editor.value;
        Prism.highlightElement(this.output);
    },

    updateLineNumbers() {
        const lineNumbers = document.querySelector('.line-numbers');
        const lineCount = this.editor.value.split('\n').length;
        lineNumbers.innerHTML = Array.from(
            { length: lineCount }, 
            (_, i) => `<div>${i + 1}</div>`
        ).join('');
    },

    logToConsole(content, type = 'log') {
        const timestamp = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.className = type;
        entry.textContent = `[${timestamp}] ${content}`;
        this.consoleOutput.appendChild(entry);
        this.consoleOutput.scrollTop = this.consoleOutput.scrollHeight;
    },

    async runCode() {
        const code = this.editor.value;
        const language = this.languageSelect.value;
        
        this.logToConsole('------- Running Program -------');

        if (language === 'javascript') {
            this.runJavaScript(code);
        } else if (language === 'python') {
            await this.runPython(code);
        }
    },

    runJavaScript(code) {
        const originalLog = console.log;
        const originalError = console.error;

        console.log = (...args) => {
            const output = args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ');
            this.logToConsole(output);
            originalLog.apply(console, args);
        };

        console.error = (...args) => {
            const output = args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ');
            this.logToConsole(output, 'error');
            originalError.apply(console, args);
        };

        try {
            const result = eval(code);
            if (result !== undefined) {
                this.logToConsole(`=> ${result}`, 'result');
            }
        } catch (error) {
            this.logToConsole(error.message, 'error');
        } finally {
            console.log = originalLog;
            console.error = originalError;
        }
    },

    async runPython(code) {
        if (!pyodide) {
            this.logToConsole("Python environment not ready!", "error");
            return;
        }

        try {
            // Run the Python code
            const result = await pyodide.runPythonAsync(code);
            
            // If there's a return value, display it
            if (result !== undefined && result !== null && result !== pyodide.globals.get('None')) {
                this.logToConsole(`=> ${result}`, 'result');
            }
        } catch (error) {
            this.logToConsole(`Error: ${error.message}`, 'error');
        }
    }
};

// Initialize the editor when the page loads
document.addEventListener('DOMContentLoaded', () => editor.init());
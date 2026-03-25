const fs = require('fs');
const file = 'C:/Users/usuario-001/Downloads/Water Transfer Track V2 - index.html';
let content = fs.readFileSync(file, 'utf8');

// The marker where the injected script starts in the JS string
const marker1 = "<script>";
const marker2 = "/**\\r\\n * Iframe 元素高亮注入脚本";
const marker2_lf = "/**\\n * Iframe 元素高亮注入脚本";

let startIdx = content.indexOf(marker2);
if (startIdx === -1) startIdx = content.indexOf(marker2_lf);
if (startIdx !== -1) {
    // Find the `<script>` tag before it
    const actualStart = content.lastIndexOf('<script>', startIdx);
    
    // Find the end script tag
    const endMarker = "})();";
    const endScript = content.indexOf("</script>", content.indexOf(endMarker, actualStart));
    
    if (actualStart !== -1 && endScript !== -1) {
        let actualEnd = endScript + "</script>".length;
        
        // Remove the block
        content = content.substring(0, actualStart) + content.substring(actualEnd);
        fs.writeFileSync(file, content);
        console.log("Successfully removed injected code block!");
    } else {
        console.log("Could not find end of script.");
    }
} else {
    console.log("Could not find start marker.");
}

const text = "```json\n{\"desc\": \"black\"}\n```";
console.log('Original:', text);
const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
console.log('Cleaned:', clean);
console.log('Parsed:', JSON.parse(clean));

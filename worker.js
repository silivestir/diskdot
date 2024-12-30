onmessage = async function(event) {
  const { directory } = event.data;
  const file = await directory.getFile('example_file.js');
  const code = await file.text();
  eval(code);
}
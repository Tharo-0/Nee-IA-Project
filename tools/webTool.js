import fetch from 'node-fetch';

export async function webSearch(query) {
  try {
    const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`);
    const data = await response.json();
    return data.RelatedTopics.map(item => item.Text).slice(0, 5);
  } catch (error) {
    console.error("Error en webSearch:", error);
    return ["Error al buscar en la web."];
  }
}

export async function fetchWebsite(url) {
  try {
    const response = await fetch(url);
    const text = await response.text();
    return text.slice(0, 2000); // Devuelve solo los primeros 2000 caracteres
  } catch (error) {
    console.error("Error en fetchWebsite:", error);
    return "Error al obtener el contenido del sitio.";
  }
}

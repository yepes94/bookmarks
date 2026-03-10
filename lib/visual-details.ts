export interface ItemVisualDetails {
  clothing: string
  filigreeColor: string
  identifyingSymbol: string
  symbolLocation: string
  promptDescription?: string
}

const saintVisualDetails: Record<string, ItemVisualDetails> = {
  "San Pedro": { clothing: "a dark blue mantle over a golden-ochre tunic", filigreeColor: "gold", identifyingSymbol: "two large crossed keys (one gold, one silver)", symbolLocation: "hanging from his belt at his side" },
  "San Pablo": { clothing: "a deep red mantle over a green tunic", filigreeColor: "gold", identifyingSymbol: "a long sword pointing downward", symbolLocation: "sheathed at his side, hanging from his belt" },
  "Virgen Maria": { clothing: "a deep blue mantle over a white dress", filigreeColor: "silver", identifyingSymbol: "a crown of twelve stars", symbolLocation: "floating above her head, around the halo" },
  "San Jose": { clothing: "a brown mantle over a cream-colored tunic", filigreeColor: "gold", identifyingSymbol: "a blooming wooden staff with white lilies", symbolLocation: "leaning against his shoulder in the background" },
  "San Juan Bautista": { clothing: "a rough camel-hair garment with a leather belt", filigreeColor: "bronze", identifyingSymbol: "a small lamb", symbolLocation: "standing at his feet, looking upward" },
  "San Francisco de Asis": { clothing: "a simple brown Franciscan habit with a knotted rope belt", filigreeColor: "olive green", identifyingSymbol: "a small bird perched on his shoulder and faint stigmata marks on the backs of his hands", symbolLocation: "the bird on his shoulder, stigmata subtly visible on the hands holding the manuscript" },
  "Santo Tomas de Aquino": { clothing: "a white Dominican habit with a black cappa (cloak)", filigreeColor: "gold", identifyingSymbol: "a radiant sun emblem", symbolLocation: "embroidered on the cover of the book he holds" },
  "Santa Teresa de Calcuta": { clothing: "a white sari with blue stripes on the border", filigreeColor: "blue", identifyingSymbol: "a small crucifix pinned to her left shoulder", symbolLocation: "pinned on the left side of her sari near the shoulder", promptDescription: "an elderly Catholic nun and missionary saint, with deeply wrinkled skin and a kind, warm expression. She wears a white sari with distinctive blue border stripes, the habit of her religious order" },
  "Santa Rosa de Lima": { clothing: "a white Dominican habit with a black veil", filigreeColor: "rose pink", identifyingSymbol: "a crown of roses on her head", symbolLocation: "resting on her head beneath the veil" },
  "San Miguel Arcangel": { clothing: "a gleaming silver and blue armor with a flowing red cape", filigreeColor: "gold", identifyingSymbol: "a flaming sword and a shield", symbolLocation: "the sword sheathed on his back, the shield strapped to his arm behind the book" },
  "San Agustin": { clothing: "black Augustinian robes with a bishop's mitre and crosier", filigreeColor: "gold", identifyingSymbol: "a flaming heart", symbolLocation: "glowing on his chest, visible above the book he holds" },
  "San Ignacio de Loyola": { clothing: "a black Jesuit cassock", filigreeColor: "gold", identifyingSymbol: "the IHS monogram radiating light", symbolLocation: "inscribed on the cover of the book he holds" },
  "Santa Teresa de Jesus": { clothing: "a brown Carmelite habit with a white mantle and black veil", filigreeColor: "gold", identifyingSymbol: "a quill pen", symbolLocation: "tucked into the pages of the book she holds as a bookmark" },
  "San Juan de la Cruz": { clothing: "a brown Carmelite habit with a white mantle", filigreeColor: "dark blue", identifyingSymbol: "a wooden cross", symbolLocation: "hanging from a cord around his neck, resting on his chest above the book" },
  "San Antonio de Padua": { clothing: "a brown Franciscan habit with a knotted rope belt", filigreeColor: "gold", identifyingSymbol: "the Child Jesus", symbolLocation: "appearing in a vision of light above the book he holds" },
  "San Benito": { clothing: "a black Benedictine habit", filigreeColor: "bronze", identifyingSymbol: "a broken cup with a serpent", symbolLocation: "at his feet, while he holds the book of the Holy Rule" },
  "San Francisco Javier": { clothing: "a black Jesuit cassock with a surplice", filigreeColor: "gold", identifyingSymbol: "a crucifix and a seashell", symbolLocation: "the crucifix hanging from his neck, the shell attached to his belt" },
  "Santa Catalina de Siena": { clothing: "a white Dominican habit with a black mantle and white veil", filigreeColor: "gold", identifyingSymbol: "a crown of thorns and a lily", symbolLocation: "the crown of thorns on her head, the lily tucked into her belt" },
  "San Martin de Porres": { clothing: "a black and white Dominican habit", filigreeColor: "gold", identifyingSymbol: "a broom and a small dog, cat, and mouse eating together", symbolLocation: "the broom leaning against the wall behind him, the animals at his feet" },
  "San Juan Bosco": { clothing: "a black priestly cassock", filigreeColor: "gold", identifyingSymbol: "a group of small children gathered around him", symbolLocation: "two small children peeking from behind his cassock at his sides" },
  "Santa Teresita del Nino Jesus": { clothing: "a brown Carmelite habit with a white mantle and black veil", filigreeColor: "rose pink", identifyingSymbol: "roses and a small crucifix", symbolLocation: "roses scattered at her feet, the crucifix hanging from her neck" },
  "San Patricio": { clothing: "green bishop's vestments with a mitre and crosier", filigreeColor: "green", identifyingSymbol: "a shamrock (three-leaf clover)", symbolLocation: "embroidered prominently on the front of his vestments" },
  "San Jorge": { clothing: "silver armor with a white tunic bearing a red cross", filigreeColor: "red", identifyingSymbol: "a lance and a defeated dragon", symbolLocation: "the lance strapped to his back, the dragon defeated beneath his feet" },
  "Santiago Apostol": { clothing: "a brown pilgrim's cloak with scallop shells and a wide-brimmed hat", filigreeColor: "gold", identifyingSymbol: "a pilgrim's staff and a scallop shell", symbolLocation: "the staff leaning against his shoulder, a large shell pinned on his cloak" },
  "San Andres Apostol": { clothing: "a blue-green mantle over a white tunic", filigreeColor: "gold", identifyingSymbol: "an X-shaped cross (saltire)", symbolLocation: "standing behind him in the background, visible over his shoulders" },
  "San Marcos Evangelista": { clothing: "a red mantle over a blue tunic", filigreeColor: "gold", identifyingSymbol: "a winged lion", symbolLocation: "sitting at his feet, looking upward" },
  "San Lucas Evangelista": { clothing: "a green mantle over an ochre tunic", filigreeColor: "gold", identifyingSymbol: "a winged ox and a painter's palette", symbolLocation: "the ox at his feet, the palette resting on a ledge beside him" },
  "San Mateo Apostol": { clothing: "a purple mantle over a white tunic", filigreeColor: "gold", identifyingSymbol: "an angel", symbolLocation: "hovering near his shoulder as he holds his ledger book" },
  "San Juan Evangelista": { clothing: "a red mantle over a green tunic", filigreeColor: "gold", identifyingSymbol: "an eagle and a chalice with a serpent", symbolLocation: "the eagle perched at his side, the chalice on a ledge beside him" },
  "San Nicolas de Bari": { clothing: "red bishop's vestments with a mitre and crosier", filigreeColor: "gold", identifyingSymbol: "three golden spheres (or bags of gold)", symbolLocation: "resting at his feet on the ground" },
  "Santa Lucia": { clothing: "a red dress with a green mantle", filigreeColor: "gold", identifyingSymbol: "a plate with two eyes and a palm branch", symbolLocation: "the plate resting on a ledge beside her, the palm branch tucked into her belt" },
  "Santa Cecilia": { clothing: "a golden-yellow dress with a blue mantle", filigreeColor: "gold", identifyingSymbol: "a small organ or lyre", symbolLocation: "resting on a surface beside her" },
  "San Sebastian": { clothing: "a white loincloth, with a soldier's red cape draped over one shoulder", filigreeColor: "red", identifyingSymbol: "arrows and a palm branch of martyrdom", symbolLocation: "arrows piercing his torso, the palm branch leaning against his side" },
  "Santo Domingo de Guzman": { clothing: "a white Dominican habit with a black cappa (cloak)", filigreeColor: "gold", identifyingSymbol: "a rosary and a star on his forehead", symbolLocation: "the rosary draped around his neck, the star shining on his brow" },
  "San Felipe Neri": { clothing: "a black priestly cassock with a white surplice", filigreeColor: "gold", identifyingSymbol: "a flaming heart and a lily", symbolLocation: "the flaming heart glowing on his chest, the lily tucked into his surplice" },
  "San Carlos Borromeo": { clothing: "a red cardinal's cassock with a white rochet", filigreeColor: "red", identifyingSymbol: "a rope noose around his neck (symbol of penance) and a crucifix", symbolLocation: "the rope around his neck, the crucifix hanging from his chest" },
  "San Francisco de Sales": { clothing: "purple bishop's vestments with a white rochet", filigreeColor: "gold", identifyingSymbol: "a quill pen", symbolLocation: "tucked into the pages of the book he holds" },
  "Santa Clara de Asis": { clothing: "a brown Franciscan habit with a black veil and rope belt", filigreeColor: "gold", identifyingSymbol: "a monstrance with the Blessed Sacrament", symbolLocation: "resting on a small stand beside her" },
  "San Alfonso Maria de Ligorio": { clothing: "a red Redemptorist habit with a bishop's pectoral cross", filigreeColor: "gold", identifyingSymbol: "a pen", symbolLocation: "tucked into the pages of his book of moral theology that he holds" },
  "San Juan Maria Vianney": { clothing: "a black priestly cassock with a surplice and purple stole", filigreeColor: "purple", identifyingSymbol: "a confessional stole and a small crucifix", symbolLocation: "the stole around his neck, the crucifix hanging from his chest" },
  "San Pio de Pietrelcina": { clothing: "a brown Capuchin habit with a rope belt", filigreeColor: "brown", identifyingSymbol: "fingerless gloves covering stigmata on his hands", symbolLocation: "visible on his hands as they hold the book" },
  "San Juan Pablo II": { clothing: "white papal vestments with a papal zucchetto (skullcap)", filigreeColor: "gold", identifyingSymbol: "a large papal crucifix staff (ferula)", symbolLocation: "standing upright beside him in the background", promptDescription: "a saintly Catholic pope figure, an elderly man with a sturdy build and gentle, paternal expression. He wears white papal vestments with a white zucchetto skullcap, the traditional dress of a pope" },
  "San Josemaria Escriva": { clothing: "a black priestly cassock", filigreeColor: "gold", identifyingSymbol: "a rose and a cross", symbolLocation: "a small cross on his lapel, a rose tucked into the book he holds" },
  "Santa Faustina Kowalska": { clothing: "a black religious habit with a white coif and veil", filigreeColor: "pale blue", identifyingSymbol: "an image of the Divine Mercy (Jesus with red and white rays)", symbolLocation: "appearing as a vision in the background behind her" },
  "San Maximiliano Kolbe": { clothing: "a dark brown Franciscan habit with a rope belt", filigreeColor: "blue", identifyingSymbol: "a striped concentration camp uniform visible beneath the habit, and a small medal of the Immaculate Virgin", symbolLocation: "the medal hanging from his neck, the camp uniform peeking at the collar" },
  "Santa Edith Stein": { clothing: "a brown Carmelite habit with a white mantle and black veil", filigreeColor: "gold", identifyingSymbol: "a Star of David intertwined with a cross", symbolLocation: "embroidered on the front of her scapular at chest level" },
  "San Oscar Romero": { clothing: "a white alb with a red chasuble (vestments of a martyred bishop)", filigreeColor: "red", identifyingSymbol: "a chalice and a microphone", symbolLocation: "the chalice on an altar beside him, the microphone standing nearby" },
  "San Rafael Arcangel": { clothing: "a flowing green and white robe with golden sandals", filigreeColor: "green", identifyingSymbol: "a staff and a fish", symbolLocation: "the staff leaning against his shoulder, the fish at his feet" },
  "San Gabriel Arcangel": { clothing: "a flowing white and gold robe", filigreeColor: "gold", identifyingSymbol: "a lily and a scroll with the words 'Ave Maria'", symbolLocation: "the lily tucked into his sash, the scroll draped over his arm beside the book" },
}

export function getItemVisualDetails(itemName: string): ItemVisualDetails | undefined {
  return saintVisualDetails[itemName]
}

const defaultDetails: ItemVisualDetails = {
  clothing: "traditional religious vestments",
  filigreeColor: "gold",
  identifyingSymbol: "their most recognizable attribute",
  symbolLocation: "placed nearby — not in their hands",
}

export function getItemVisualDetailsWithDefault(itemName: string): ItemVisualDetails {
  return saintVisualDetails[itemName] ?? defaultDetails
}

const STYLE_CONSTRAINTS = `
Composition & Framing: Full-body or half-body portrait, full-bleed composition filling the entire canvas. No margins.
Style & Technical: Elegant, clean line-art with crisp black outlines. Sophisticated, adult aesthetic. Natural skin tones with soft lighting.
Negative Constraints: No frames, borders, text, extra limbs, paper textures, or background landscapes. Solid flat background (Hex: #00b140).`

export const PLACEHOLDER_NAME = "{{name}}"
export const PLACEHOLDER_DESCRIPTION = "{{description}}"

export function applyPromptTemplate(
  template: string,
  name: string,
  description?: string
): string {
  return template
    .replaceAll(PLACEHOLDER_NAME, name)
    .replaceAll(PLACEHOLDER_DESCRIPTION, description ?? "")
}

const GENERIC_STYLE_CONSTRAINTS = `
Composition & Framing: Full-body or half-body portrait, full-bleed composition filling the entire canvas. No margins.
Style & Technical: Elegant, clean line-art with crisp black outlines. Sophisticated, adult aesthetic. Natural colors with soft lighting.
Negative Constraints: No frames, borders, text, extra limbs, paper textures, or background landscapes. Solid flat background (Hex: #00b140).`

function buildGenericItemPrompt(itemName: string, itemDescription?: string): string {
  const context = itemDescription?.trim()
    ? `\nContext: ${itemDescription.trim()}\n`
    : ""
  return `Role & Task: You are a professional illustrator. Create a high-quality, full-bleed digital illustration for a bookmark.

Subject: ${itemName}${context}

${GENERIC_STYLE_CONSTRAINTS}`
}

export function buildItemPrompt(
  itemName: string,
  itemDescription?: string,
  userPrompt?: string,
  projectPromptTemplate?: string
): string {
  if (userPrompt && userPrompt.trim()) {
    return `Role & Task: You are a professional illustrator. Create a high-quality, full-bleed digital illustration for a bookmark.

Subject (user-provided): ${userPrompt.trim()}

${STYLE_CONSTRAINTS}`
  }

  if (projectPromptTemplate?.trim()) {
    const base = applyPromptTemplate(projectPromptTemplate.trim(), itemName, itemDescription)
    return `Role & Task: You are a professional illustrator. Create a high-quality, full-bleed digital illustration for a bookmark.

${base}

${GENERIC_STYLE_CONSTRAINTS}`
  }

  // Use generic prompt for items not in the saints catalog
  if (!(itemName in saintVisualDetails)) {
    return buildGenericItemPrompt(itemName, itemDescription)
  }

  const details = saintVisualDetails[itemName] ?? defaultDetails
  const subjectBlock = details.promptDescription
    ? `Variable Subject:\n- Figure: ${details.promptDescription}`
    : `Variable Subject:\n- Saint: ${itemName}`

  return `Role & Task: You are a professional illustrator specializing in sacred art. Your task is to create a high-quality, full-bleed digital illustration for a religious bookmark featuring a holy figure.

${subjectBlock}

Composition & Framing: Full-body or half-body portrait. The art must be full-bleed, filling the entire canvas. Pose: The saint is depicted in devotion, holding an ancient prayer book. The identifying symbol, ${details.identifyingSymbol}, is located ${details.symbolLocation}. Hands must hold the book only.
Style & Technical: Wearing ${details.clothing}, decorated with intricate ${details.filigreeColor} ornamental filigree. Elegant line-art with crisp black outlines. A simple luminous circular halo behind the head. Background: solid flat green (Hex: #00b140).
Negative Constraints: No frames, borders, text, extra limbs, paper textures, or landscape backgrounds.`

}

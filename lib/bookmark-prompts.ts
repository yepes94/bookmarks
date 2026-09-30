const FORMAT = `FORMAT:
- This image is the finished printed side of a bookmark, not a background and not an illustration waiting for captions.
- Tall narrow vertical strip, about 440 pixels wide and 1360 pixels tall.
- Full bleed: the design fills the entire canvas, edge to edge.
- Keep every letter at least 8 percent away from the edges so nothing is cropped.`

export function buildFrontPiecePrompt(title: string, subtitle: string): string {
  const cleanTitle = title.trim()
  const cleanSubtitle = subtitle.trim()
  const subtitleLine = cleanSubtitle
    ? `Subtitle, drawn inside the image and spelled exactly: "${cleanSubtitle}"`
    : "There is no subtitle. Do not invent a second line of text."

  return `Create the FINAL FRONT of a paper bookmark. The typography is part of the picture. Do not leave blank space for someone else to add the words later.

${FORMAT}

Draw these words inside the image, in clear serif lettering, spelled exactly as written:
- Title: "${cleanTitle}"
- ${subtitleLine}

The title and subtitle must be readable in the image itself. You may add a simple watercolor or line illustration around them.

Do not add any other words, letters, or numbers.
Do not omit the title.`
}

export function buildBackPiecePrompt(text: string): string {
  const cleanText = text.trim()
  return `Create the FINAL BACK of a paper bookmark. The typography is part of the picture. Do not leave blank space for someone else to add the words later.

${FORMAT}

Draw this text inside the image, in clear serif lettering, spelled exactly as written, and keep the line breaks if it is long:
"${cleanText}"

That text must be readable in the image itself. You may add a quiet watercolor wash or a simple ornament around it.

Do not add any other words, letters, or numbers.
Do not omit the text.`
}

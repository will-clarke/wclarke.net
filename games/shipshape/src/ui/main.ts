// UI entry point. Renderer built in TASKS.md T14-T16. Until then: a placeholder.
const canvas = document.getElementById('game') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!

function draw(): void {
  canvas.width = window.innerWidth * devicePixelRatio
  canvas.height = window.innerHeight * devicePixelRatio
  ctx.fillStyle = '#0a0e14'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#7fd4ff'
  ctx.font = `${24 * devicePixelRatio}px monospace`
  ctx.textAlign = 'center'
  ctx.fillText('SHIPSHAPE', canvas.width / 2, canvas.height / 2)
  ctx.fillStyle = '#556'
  ctx.font = `${12 * devicePixelRatio}px monospace`
  ctx.fillText('ui pending - see TASKS.md T14', canvas.width / 2, canvas.height / 2 + 30 * devicePixelRatio)
}

window.addEventListener('resize', draw)
draw()

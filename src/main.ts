import { getSceneNodeById, getSelectedNodesOrAllNodes, on, showUI } from '@create-figma-plugin/utilities'
import { types } from './types'

let transformStroke = false

export default async function () {
  on('transform-stroke', (value) => {
    transformStroke = value
    invalidate()
  })

  figma.on('selectionchange', async () => {
    invalidate()
  })

  invalidate()
}

const invalidate = async () => {
  const scenes = await collectScenes()
  showUI({
    height: 400,
    width: 600
  }, {
    nodes: scenes,
    transformStroke
  })
}

const collectScenes = async () => {
  const selectedScenes = getSelectedNodesOrAllNodes()

  console.log(selectedScenes[0].type)

  const flat: { node: SceneNode, name: string }[] = []

  for (const scene of selectedScenes) {
    if (scene.type === 'COMPONENT_SET') {
      for(const child of scene.children) {
        if (child.type === 'COMPONENT') {
          const parts = child.name.split(/,\s*/);
          const formattedParts = parts.map(part => part.split('=')[1]);
          const name = formattedParts.join('/') || child.name
          flat.push({ name: `${scene.name}/${name}`, node: child })
        }
      }
    }
    else if (scene.type === 'COMPONENT') {
      flat.push({ name: scene.name, node: scene })
    }
  }

  console.log(flat)

  const scenePromises: Promise<types.Component>[] = flat.map(async scene => {
    const componentName = pascalize(scene.name).replace(new RegExp(' ', 'g'), '_')
    const svgUintArray = await scene.node.exportAsync({format: 'SVG'})

    let svgMarkup = Utf8ArrayToStr(svgUintArray)

    const htmlPlainProperties = ['stroke-dasharray', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dash-offset', 'stroke-miterlimit', 'stroke-opacity', 'stroke-width', 'clip-path', 'clip-rule', 'fill-opacity', 'fill-rule']
    svgMarkup = svgMarkup.replace('xmlns="http://www.w3.org/2000/svg"', 'xmlns="http://www.w3.org/2000/svg" {...props}')
    for(const property of htmlPlainProperties) {
      svgMarkup = svgMarkup.replace(new RegExp(property, 'g'), camelize(property))
    }

    if (transformStroke) {
      svgMarkup = svgMarkup.replace(/stroke="#?[^"]*"/g, 'stroke="currentColor"')
    }

      svgMarkup = `
import { SVGProps } from 'react'

const ${componentName} = (props: SVGProps<SVGSVGElement>) => (
  ${svgMarkup})

export { ${componentName} }
      `

    return {
      id: scene.node.id,
      name: scene.name,
      svg: svgMarkup,
      componentName: componentName
    }
  })

  const scenes = await Promise.all(scenePromises)

  return scenes
}

function Utf8ArrayToStr(array: Uint8Array) {
  let out, i, c;
  let char2, char3;

  out = "";
  const len = array.length;
  i = 0;
  while(i < len) {
  c = array[i++];
  switch(c >> 4)
  { 
    case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
      // 0xxxxxxx
      out += String.fromCharCode(c);
      break;
    case 12: case 13:
      // 110x xxxx   10xx xxxx
      char2 = array[i++];
      out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
      break;
    case 14:
      // 1110 xxxx  10xx xxxx  10xx xxxx
      char2 = array[i++];
      char3 = array[i++];
      out += String.fromCharCode(((c & 0x0F) << 12) |
                     ((char2 & 0x3F) << 6) |
                     ((char3 & 0x3F) << 0));
      break;
  }
  }

  return out;
}

const pascalize = (s: string) => `-${s}`.split('/').join('-').replace(/-./g, x=>x[1].toUpperCase())
const camelize = (s: string) => `${s}`.split('/').join('-').replace(/-./g, x=>x[1].toUpperCase())
import { getSceneNodeById, getSelectedNodesOrAllNodes, on, showUI } from '@create-figma-plugin/utilities'
import { types } from './types'

export default async function () {
  const selectedScenes = getSelectedNodesOrAllNodes()

  const scenePromises: Promise<types.Component>[] = selectedScenes.map(async scene => {
    const componentName = camelize(scene.name)
    const svgUintArray = await scene.exportAsync({format: 'SVG'})

    let svgMarkup = Utf8ArrayToStr(svgUintArray)

      svgMarkup = svgMarkup.replace('xmlns="http://www.w3.org/2000/svg"', 'xmlns="http://www.w3.org/2000/svg" {...props}')

      svgMarkup = `
import { SVGProps } from 'react'

const ${componentName} = (props: SVGProps<SVGSVGElement>) => (
  ${svgMarkup})

export { ${componentName} }
      `

    return {
      id: scene.id,
      name: scene.name,
      svg: svgMarkup,
      componentName: componentName
    }
  })

  const scenes = await Promise.all(scenePromises)

  on('DOWNLOAD', () => {
  })

  showUI({
    height: 400,
    width: 600
  }, {
    nodes: scenes
  })
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

const camelize = (s: string) => `-${s}`.replace(/-./g, x=>x[1].toUpperCase())
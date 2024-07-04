import { Button, Checkbox, Container, Text, VerticalSpace, render } from '@create-figma-plugin/ui'
import prettier from 'prettier'
import typescriptPlugin from 'prettier/plugins/typescript'
import estreePlugin from 'prettier/plugins/estree'
import babelPlugin from 'prettier/plugins/babel'
import { h } from 'preact'
import '!./output.css'
import { useEffect, useState } from 'preact/hooks'
import { memo } from 'preact/compat'
import JSZip from 'jszip'
import {saveAs} from 'file-saver'
import { types } from './types'
import { emit } from '@create-figma-plugin/utilities'

type Props = {
  nodes: types.Component[]
  transformStroke: boolean
}

const codes: Record<string, string> = {}

function Plugin ({ nodes, transformStroke }: Props) {
  const onChangeTransformStroke = (value: boolean) => {
    emit('transform-stroke', value)
  }

  const onClickDownloadSvgs = async () => {
    const zip = new JSZip();
    const folder = zip.folder('svg')
    Object.keys(codes).forEach(componentName => {
      folder!.file(`${componentName}.tsx`, codes[componentName])
    })
    zip.file('Icon.tsx', await generateIconComponent())
    const file = await zip.generateAsync({ type: 'blob' })
    saveAs(file, 'icons.zip')
  }

  return (
     <Container space='large'>
        <VerticalSpace space='medium'></VerticalSpace>
        <Button onClick={onClickDownloadSvgs}>svg 다운로드</Button>
        <VerticalSpace space='medium'></VerticalSpace>
        <Checkbox size={24} value={transformStroke} onValueChange={onChangeTransformStroke}>stroke 를 currentColor로 대체</Checkbox>
        <VerticalSpace space='medium'></VerticalSpace>
        {nodes.map(node => {
          return <div key={node.id}>
            <Text>{node.name}</Text>
            <VerticalSpace space='medium'></VerticalSpace>
            <PretteyCode name={node.componentName} code={node.svg} />
            <VerticalSpace space='medium'></VerticalSpace>
          </div>
        })}
     </Container>
  )
}

type PretteyCodeProps = {
  code: string
  name: string
}

const PretteyCode = memo(({ code, name }: PretteyCodeProps) => {
  const [formatted, setFormatted] = useState('')

  useEffect(() => {
    prettier.format(code, { parser: 'babel-ts', plugins: [typescriptPlugin, estreePlugin, babelPlugin] }).then(v => {
      setFormatted(v)
      codes[name] = v
    })
  }, [])

  return <div class="whitespace-pre bg-gray-200 text-gray-800 rounded px-4 py-4 break-all overflow-hidden">
    {formatted}
  </div>
})

const generateIconComponent = async () => {
  const imports = () => {
    return Object.keys(codes).map(componentName => {
      return `import { ${componentName} } from './svg/${componentName}'`
    }).join('\n')
  }

  const types = () => {
    return Object.keys(codes).map(componentName => {
      return `| '${componentName}'`
    }).join('\n')
  }

  const matchPatterns = () => {
    return Object.keys(codes).map(componentName => {
      return `.with('${componentName}', icon(${componentName}))`
    }).join('\n')
  }

  const code = `
  import React, { SVGProps } from 'react'
import { match } from 'ts-pattern'
${imports()}

export type IconName =
${types()}

export type IconProps = {
name: IconName
size: number
className?: string
}

export const Icon = ({ name, size, className }: IconProps) => {
const svgParams: SVGProps<SVGSVGElement> = {
  width: size,
  height: size,
  fill: 'currentColor',
  className,
}

const icon =
  (component: (props: SVGProps<SVGSVGElement>) => React.JSX.Element) => () =>
    component(svgParams)

return match(name)
${matchPatterns()}
  .exhaustive()
}
  `

  return prettier.format(code, { parser: 'babel-ts', plugins: [typescriptPlugin, estreePlugin, babelPlugin] })
}

export default render(Plugin)

const { v4: uuidv4 } = require('uuid')
const {
  toSsrComment,
  toPropComment,
  toClientPropsPathFromOutputPath,
  toResolvedIslandPath,
  extractPropIdsFromHtml,
  toClientScript,
  toIslandExt,
  handleProp,
} = require('./utils.cjs')

/**
 * @param {import('@11ty/eleventy/src/UserConfig')} eleventyConfig
 * @param {import('./@types').UserConfig} userConfig
 * @param {Pick<import('./@types').PluginGlobals, 'ssrIslandsByInputPath' | 'propsByInputPath' | 'extToRendererMap'>} pluginGlobals
 */
module.exports = function shortcodes(
  eleventyConfig,
  userConfig,
  { ssrIslandsByInputPath, propsByInputPath, extToRendererMap },
) {
  eleventyConfig.addPairedShortcode(
    'serverOnlyIsland',
    function (htmlWithPropComments, unresolvedIslandPath) {
      const { inputPath } = this.page
      const islandId = uuidv4()
      const islandPath = toResolvedIslandPath(unresolvedIslandPath, userConfig.islandsDir)
      const { htmlWithoutPropComments, propIds } = extractPropIdsFromHtml(htmlWithPropComments)

      const existingSsrComponents = ssrIslandsByInputPath.get(inputPath)
      ssrIslandsByInputPath.set(inputPath, {
        ...existingSsrComponents,
        [islandId]: {
          islandPath,
          propIds,
          slots: { default: htmlWithoutPropComments },
        },
      })

      return toSsrComment(islandId)
    },
  )

  eleventyConfig.addPairedShortcode(
    'island',
    function (htmlWithPropComments, unresolvedIslandPath, ...loadConditions) {
      const { inputPath } = this.page
      const renderer = extToRendererMap.get(toIslandExt(unresolvedIslandPath))
      if (typeof renderer?.clientEntrypoint !== 'string') {
        throw new Error(
          `No client renderer found for ${JSON.stringify(unresolvedIslandPath)} in ${JSON.stringify(
            inputPath,
          )}! Please add a renderer to your Slinkity plugin config. See https://slinkity.dev/docs/component-shortcodes/#prerequisites for more.`,
        )
      }
      const islandId = uuidv4()
      const islandPath = toResolvedIslandPath(unresolvedIslandPath, userConfig.islandsDir)
      const clientPropsPath = toClientPropsPathFromOutputPath(
        this.page.outputPath,
        eleventyConfig.dir.output,
      )
      const { htmlWithoutPropComments, propIds } = extractPropIdsFromHtml(htmlWithPropComments)
      const existingSsrComponents = ssrIslandsByInputPath.get(inputPath)
      ssrIslandsByInputPath.set(inputPath, {
        ...existingSsrComponents,
        [islandId]: {
          islandPath,
          propIds,
          slots: { default: htmlWithoutPropComments },
        },
      })

      return toClientScript({
        isClientOnly: false,
        islandId,
        islandPath,
        loadConditions,
        clientPropsPath,
        clientRendererPath: renderer.clientEntrypoint,
        propIds,
      })
    },
  )

  eleventyConfig.addPairedShortcode(
    'clientOnlyIsland',
    function (htmlWithPropComments, unresolvedIslandPath, ...loadConditions) {
      const { inputPath } = this.page
      const renderer = extToRendererMap.get(toIslandExt(unresolvedIslandPath))
      if (typeof renderer?.clientEntrypoint !== 'string') {
        throw new Error(
          `No client renderer found for ${JSON.stringify(unresolvedIslandPath)} in ${JSON.stringify(
            inputPath,
          )}! Please add a renderer to your Slinkity plugin config. See https://slinkity.dev/docs/component-shortcodes/#prerequisites for more.`,
        )
      }
      const islandId = uuidv4()
      const islandPath = toResolvedIslandPath(unresolvedIslandPath, userConfig.islandsDir)
      const clientPropsPath = toClientPropsPathFromOutputPath(
        this.page.outputPath,
        eleventyConfig.dir.output,
      )
      const { propIds } = extractPropIdsFromHtml(htmlWithPropComments)

      return toClientScript({
        isClientOnly: true,
        islandId,
        islandPath,
        loadConditions,
        clientPropsPath,
        clientRendererPath: renderer.clientEntrypoint,
        propIds,
      })
    },
  )

  eleventyConfig.addShortcode('prop', function (name, value) {
    const { inputPath } = this.page
    const { id } = handleProp({
      name,
      value,
      propsByInputPath,
      inputPath,
    })

    return toPropComment(id)
  })
}

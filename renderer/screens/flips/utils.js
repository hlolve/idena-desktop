/* eslint-disable no-plusplus */
/* eslint-disable block-scoped-var */
/* eslint-disable prefer-destructuring */
/* eslint-disable no-use-before-define */
/* eslint-disable no-shadow */
import {encode} from 'rlp'
import axios from 'axios'
import dayjs from 'dayjs'
import Jimp from 'jimp'
import {loadPersistentStateValue, persistItem} from '../../shared/utils/persist'
import {FlipType} from '../../shared/types'
import {areSame, areEual} from '../../shared/utils/arr'
import {submitFlip} from '../../shared/api/dna'
import {signNonce} from '../dna/utils'
import i18n from '../../i18n'
import ImageAccess from './ImageAccess'

const convert = require('color-convert')
const StackBlur = require('stackblur-canvas')

export const FLIP_LENGTH = 4
export const DEFAULT_FLIP_ORDER = [0, 1, 2, 3]

export function getRandomKeywordPair() {
  function getRandomInt(min, max) {
    // eslint-disable-next-line no-param-reassign
    min = Math.ceil(min)
    // eslint-disable-next-line no-param-reassign
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min)) + min
  }

  return {id: 0, words: [getRandomInt(3300, 3939), getRandomInt(3300, 3939)]}
}

export function isPendingKeywordPair(flips, id) {
  return flips.find(
    ({type, keywordPairId}) =>
      type === FlipType.Publishing && keywordPairId === id
  )
}

export function didArchiveFlips(epoch) {
  const persistedState = loadPersistentStateValue('flipArchive', epoch)
  if (persistedState) return persistedState.archived
  return false
}

export function archiveFlips() {
  const {getFlips, saveFlips} = global.flipStore
  saveFlips(
    getFlips().map(flip =>
      flip.type === FlipType.Archived
        ? flip
        : {...flip, type: FlipType.Archived}
    )
  )
}

export const freshFlip = ({createdAt, modifiedAt = createdAt}) =>
  dayjs().diff(modifiedAt, 'day') < 30

export const outdatedFlip = ({createdAt, modifiedAt = createdAt}) =>
  dayjs().diff(modifiedAt, 'day') >= 30

export function handleOutdatedFlips() {
  const {getFlips, saveFlips} = global.flipStore
  const flips = getFlips()
  if (flips.filter(outdatedFlip).length > 0) saveFlips(flips.filter(freshFlip))
}

export function markFlipsArchived(epoch) {
  const persistedState = loadPersistentStateValue('flipArchive', epoch)
  if (persistedState && persistedState.archived) return
  persistItem('flipArchive', epoch, {
    archived: true,
    archivedAt: new Date().toISOString(),
  })
}

const perm = arr => {
  const ret = []
  for (let i = 0; i < arr.length; i += 1) {
    const rest = perm(arr.slice(0, i).concat(arr.slice(i + 1)))
    if (!rest.length) {
      ret.push([arr[i]])
    } else {
      for (let j = 0; j < rest.length; j += 1) {
        ret.push([arr[i]].concat(rest[j]))
      }
    }
  }
  return ret
}

const randomNumber = () => {
  const buf = new Uint32Array(1)
  window.crypto.getRandomValues(buf)
  return buf[0]
}

const randomPerm = arr => {
  const output = perm(arr)
  return output[randomNumber() % output.length]
}

function shufflePics(pics, shuffledOrder) {
  const seed = randomPerm(DEFAULT_FLIP_ORDER)
  const newPics = []
  const firstOrder = new Array(FLIP_LENGTH)

  seed.forEach((value, idx) => {
    newPics.push(pics[value])
    firstOrder[value] = idx
  })

  const secondOrder = shuffledOrder.map(value => firstOrder[value])

  return {
    pics: newPics,
    orders:
      randomNumber() % 2 === 0
        ? [firstOrder, secondOrder]
        : [secondOrder, firstOrder],
  }
}

export function flipToHex(pics, order) {
  const shuffled = shufflePics(pics, order)

  const publicRlp = encode([
    shuffled.pics
      .slice(0, 2)
      .map(src =>
        Uint8Array.from(atob(src.split(',')[1]), c => c.charCodeAt(0))
      ),
  ])

  const privateRlp = encode([
    shuffled.pics
      .slice(2)
      .map(src =>
        Uint8Array.from(atob(src.split(',')[1]), c => c.charCodeAt(0))
      ),
    shuffled.orders,
  ])
  return [publicRlp, privateRlp].map(x => `0x${x.toString('hex')}`)
}

export function updateFlipType(flips, {id, type}) {
  return flips.map(flip =>
    flip.id === id
      ? {
          ...flip,
          type,
          ref: flip.ref,
        }
      : flip
  )
}

export function updateFlipTypeByHash(flips, {hash, type}) {
  return flips.map(flip =>
    flip.hash === hash
      ? {
          ...flip,
          type,
          ref: flip.ref,
        }
      : flip
  )
}

export async function publishFlip({
  keywordPairId,
  pics,
  compressedPics,
  protectedImages = compressedPics || pics,
  originalOrder,
  order,
  orderPermutations,
  hint,
}) {
  if (protectedImages.some(x => !x))
    throw new Error(i18n.t('You must use 4 images for a flip'))

  const flips = global.flipStore.getFlips()

  if (
    flips.some(
      flip =>
        flip.type === FlipType.Published &&
        flip.protectedImages &&
        areSame(flip.protectedImages, protectedImages)
    )
  )
    throw new Error(i18n.t('You already submitted this flip'))

  if (areEual(order, hint ? DEFAULT_FLIP_ORDER : originalOrder))
    throw new Error(i18n.t('You must shuffle flip before submit'))

  const [publicHex, privateHex] = flipToHex(
    hint ? protectedImages : originalOrder.map(num => protectedImages[num]),
    hint ? order : orderPermutations
  )

  if (publicHex.length + privateHex.length > 2 * 1024 * 1024)
    throw new Error(i18n.t('Cannot submit flip, content is too big'))

  const {result, error} = await submitFlip(publicHex, privateHex, keywordPairId)

  if (error) {
    const {message} = error

    if (message.includes('candidate'))
      throw new Error(
        i18n.t(`It's not allowed to submit flips with your identity status`)
      )

    if (message.includes('ceremony'))
      throw new Error(
        i18n.t(`Can not submit flip during the validation session`)
      )

    throw new Error(message)
  }
  return result
}

export function formatKeywords(keywords) {
  return keywords
    .map(({name: [f, ...rest]}) => f?.toUpperCase() + rest.join(''))
    .join(' / ')
}

export async function fetchKeywordTranslations(ids, locale) {
  return (
    await Promise.all(
      ids.map(async id =>
        (
          await fetch(
            `https://translation.idena.io/word/${id}/language/${locale}/translations`
          )
        ).json()
      )
    )
  ).map(({translations}) =>
    (translations || []).map(
      ({
        id,
        name,
        description: desc,
        confirmed,
        upVotes: ups,
        downVotes: downs,
      }) => ({
        id,
        name,
        desc,
        confirmed,
        ups,
        downs,
        score: ups - downs,
      })
    )
  )
}

export async function fetchConfirmedKeywordTranslations(ids, locale) {
  return (
    await Promise.all(
      ids.map(async id =>
        (
          await fetch(
            `https://translation.idena.io/word/${id}/language/${locale}/confirmed-translation`
          )
        ).json()
      )
    )
  ).map(({translation}) => translation)
}

export async function voteForKeywordTranslation({id, up}) {
  const timestamp = new Date().toISOString()
  const signature = await signNonce(id.concat(up).concat(timestamp))

  const {
    data: {resCode, upVotes, downVotes, error},
  } = await axios.post(`https://translation.idena.io/vote`, {
    signature,
    timestamp,
    translationId: id,
    up,
  })

  if (resCode > 0 && error) throw new Error(error)

  return {id, ups: upVotes - downVotes}
}

export async function suggestKeywordTranslation({
  wordId,
  name,
  desc,
  locale = global.locale,
}) {
  const timestamp = new Date().toISOString()

  const signature = await signNonce(
    wordId
      .toString()
      .concat(locale)
      .concat(name)
      .concat(desc)
      .concat(timestamp)
  )

  const {
    data: {resCode, translationId, error},
  } = await axios.post(`https://translation.idena.io/translation`, {
    word: wordId,
    name,
    description: desc,
    language: locale,
    signature,
    timestamp,
  })

  if (resCode > 0 && error) throw new Error(error)

  return {
    id: translationId,
    wordId,
    name,
    desc,
  }
}

export const colorPickerColor = color =>
  color.includes('ffffff') ? 'rgb(210 212 217)' : `#${color}`

export async function protectFlipImage(imgSrc) {
  const blurValue = 2

  let palette = []
  try {
    // eslint-disable-next-line global-require
    const extractColors = require('extract-colors').default
    palette = await extractColors(imgSrc)
    // eslint-disable-next-line no-empty
  } catch (e) {}
  const getImageData = image => {
    const vMin = 0
    const vMax = 1

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const out = ctx.createImageData(image.width, image.height)
    const outData = out.data
    const inData = image.data

    const imgMin = image.getMinimum()
    const imgMax = image.getMaximum()
    const delta = imgMax - imgMin

    const len = inData.length

    // Special case, if all the pixel have the same value, we draw a solid gray.
    if (delta === 0) {
      // eslint-disable-next-line no-plusplus
      for (let i = 0, j = 0; i < len; i++, j += 4) {
        outData[j] = 127
        outData[j + 1] = 127
        outData[j + 2] = 127
        outData[j + 3] = 255
      }
      return out
    }

    // interpolated min/max value
    const iVMin = delta * vMin + imgMin
    const iVMax = delta * vMax + imgMin

    const iDelta = 255 / (iVMax - iVMin)

    let gray
    // eslint-disable-next-line no-plusplus
    for (let i = 0, j = 0; i < len; i++, j += 4) {
      gray = (inData[i] - iVMin) * iDelta

      // Note : value of "gray" will be automatically clamped to the nearest int between 0 and 255
      outData[j] = gray
      outData[j + 1] = gray
      outData[j + 2] = gray
      outData[j + 3] = 255
    }

    return out
  }

  const getImageFromImageData = imageData => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = imageData.width
    canvas.height = imageData.height
    ctx.putImageData(imageData, 0, 0)

    const image = new Image()
    image.src = canvas.toDataURL()
    image.width = imageData.width
    image.height = imageData.height
    return image
  }

  const getImageDataFromImage = image => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    ctx.drawImage(image, 0, 0)

    return ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)
  }

  const convertImageDataToGray = imageData => {
    const pixels = imageData.data
    for (let i = 0; i < pixels.length; i += 4) {
      const lightness = parseInt(
        (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3
      )
      pixels[i] = lightness
      pixels[i + 1] = lightness
      pixels[i + 2] = lightness
    }
  }

  const mergeMeshPixels = (sourceImageData, meshImageData) => {
    const pixels = sourceImageData.data
    const mesh = meshImageData.data
    for (let i = 0; i < pixels.length; i += 4) {
      const isRecolor = Math.random() * 100 + 1 < 21
      const isWhite = mesh[i] > 0 && mesh[i + 1] > 0 && mesh[i + 2] > 0
      if (isRecolor && isWhite) {
        const newColorId = Math.floor(Math.random() * (palette.length - 1)) + 1
        pixels[i] = palette[newColorId].red
        pixels[i + 1] = palette[newColorId].green
        pixels[i + 2] = palette[newColorId].blue
      }
    }
  }

  const modifyImageHue = imageData => {
    const pixels = imageData.data
    const rnd = Math.floor(Math.random() * 30) + 20
    for (let i = 0; i < pixels.length; i += 4) {
      const hsvImage = convert.rgb.hsv(pixels[i], pixels[i + 1], pixels[i + 2])
      const newRgbImage = convert.hsv.rgb(
        hsvImage[0] + rnd,
        hsvImage[1],
        hsvImage[2]
      )
      pixels[i] = newRgbImage[0]
      pixels[i + 1] = newRgbImage[1]
      pixels[i + 2] = newRgbImage[2]
    }
  }

  const watershed = (image, imgW, imgH) => {
    const blurToWatershed = image => {
      nx = image.width
      ny = image.height
      let outMessage = ''
      const h = [] // histogram
      const frq = [] // frequency of gray levels
      const pos = [] // position of the first pixel of a certain gray level in the sorted array
      const pixelValue = [] // gray value of the sorted pixel
      const pixelX = [] // original x position of the sorted pixel
      const pixelY = [] // original y position of the sorted pixel
      const pixelPos = [] // sorted position of the pixel (for reverse access)
      for (let i = 0; i < nx; i++) pixelPos[i] = []

      stop = false
      maxSizeStack = 0
      hist(image, h)
      frqfunc(h, frq, pos)
      sort(image, pos, pixelValue, pixelX, pixelY, pixelPos)
      const output = flooding4(
        image,
        h,
        pos,
        pixelValue,
        pixelX,
        pixelY,
        pixelPos
      )
      if (stop) outMessage = `Not Completed: more than ${MAXBASINS} basins.`
      else outMessage = 'Colorized basins.'

      return output
    }

    const getOverlayImg = image => {
      const img = image
      const {data} = img
      const len = data.length
      for (let i = 0; i < len; i++) data[i] = data[i] === 0 ? 1 : 0

      return img
    }

    /** ** Global variables *** */
    const WSHED = 0
    const MAXBASINS = 20000 // you can increase this number
    const stack = [] // the queue
    let levels = 0 // the number of gray levels
    let nx
    let ny
    let stop = false
    let maxSizeStack = 0
    let outPixels = []

    /*
     *	creates histogram of image
     *	result in array h
     */
    const hist = function(image, h) {
      let v

      for (let i = 0; i <= 255; i++) {
        h[i] = 0
      }

      for (let x = 1; x < nx - 1; x++) {
        for (let y = 1; y < ny - 1; y++) {
          v = Math.floor(image.getPixel(x, y))
          h[v]++
        }
      }

      return h
    }

    /*
     *	creates frequency function
     *	and memory position of histogram h
     *	calculates min/max gray values
     *	calculates the number of gray levels (storred in global variable!)
     *	result in arrays frq, pos, hmin, hmax,
     *
     */
    const frqfunc = function(h, frq, pos) {
      levels = 0
      frq[0] = h[0]
      if (h[0] !== 0) {
        levels++
      }
      // eslint-disable-next-line no-var,vars-on-top
      for (var i = 1; i < 256; i++) {
        frq[i] = h[i] + frq[i - 1]
        if (h[i] !== 0) {
          levels++
        }
      }

      pos[0] = 0
      pos[1] = h[0]
      for (i = 2; i < 256; i++) {
        pos[i] = h[i - 1] + pos[i - 1]
      }
    }

    /*
     *	sorts pixel values in image based on memory (=position in array)
     *		needed (calculated by frqfunc)
     *	results stored in arrays: PixelValue, pixelX, pixelY, pixelPos
     */
    const sort = function(image, pos, pixelValue, pixelX, pixelY, pixelPos) {
      let v
      const len = pos.length
      const position = []

      for (let i = 0; i < len; i++) {
        position[i] = pos[i]
      }

      for (let x = 1; x < nx - 1; x++) {
        for (let y = 1; y < ny - 1; y++) {
          v = Math.floor(image.getPixel(x, y))
          pixelValue[position[v]] = v
          pixelX[position[v]] = x
          pixelY[position[v]] = y
          pixelPos[x][y] = position[v]
          position[v]++
        }
      }
    }

    /*
     *	THE ACTUAL WATERSHED 4-connected
     */
    const flooding4 = function(
      input,
      h,
      pos,
      pixelValue,
      pixelX,
      pixelY,
      pixelPos
    ) {
      const output = new ImageAccess(nx, ny)

      const size = nx * ny

      const fWSHED = 0
      const fINIT = 1
      const fMASK = 2
      const fINQUEUE = 3

      const neigh = []
      let gray = Math.floor(pixelValue[0]) // the (first) gray value to consider
      let flag = false
      let currentLabel = 10.0

      // lookup table neighbors
      const xx = [0, -1, 1, 0, 0]
      const yy = [-1, 0, 0, 1, 4]

      outPixels = output.data
      // eslint-disable-next-line no-var,vars-on-top
      for (var i = 0; i < size; i++) {
        outPixels[i] = fINIT
      }

      let xp
      let yp

      let pgray = 0
      for (let l = 1; l <= levels && !stop; l++) {
        // for all levels

        // the first run over all pixels of the current gray level
        // marks as MASK or eventually INQUEUE (if 'dangerous' pixel)
        // eslint-disable-next-line no-var,vars-on-top
        for (var j = 0; j < h[gray]; j++) {
          // flood all the pixels of the same value
          pgray = pos[gray] + j
          xp = pixelX[pgray]
          yp = pixelY[pgray]
          outPixels[xp + nx * yp] = fMASK
          getNeighborhood34connect(xp, yp, neigh)
          // eslint-disable-next-line no-var,vars-on-top
          for (var n = 0; n < 4; n++) {
            if (neigh[n] > 4.0 || neigh[n] === fWSHED) {
              outPixels[xp + nx * yp] = fINQUEUE
              stack.push(pgray)
            }
          }
        }

        // the second run
        // checks all the pixels INQUEUE (which are also in the FIFO)
        let p // pixel position in pixelValue, pixelX, pixelY
        while (stack.length) {
          // check the pixels inqueue untill empty
          p = stack[0]

          stack.shift()
          xp = pixelX[p]
          yp = pixelY[p]
          getNeighborhood34connect(xp, yp, neigh)
          for (n = 0; n < 4; n++) {
            if (neigh[n] > 9.0) {
              if (neigh[4] === fINQUEUE || (neigh[4] === fWSHED && flag)) {
                outPixels[xp + nx * yp] = neigh[n]
                neigh[4] = neigh[n]
              } else if (neigh[4] > 9.0 && neigh[4] !== neigh[n]) {
                outPixels[xp + nx * yp] = fWSHED
                neigh[4] = fWSHED
                flag = false
              }
            } else if (neigh[n] === fWSHED) {
              if (neigh[4] === fINQUEUE) {
                outPixels[xp + nx * yp] = fWSHED
                neigh[4] = fWSHED
                flag = true
              }
            } else if (neigh[n] === fMASK) {
              outPixels[xp + xx[n] + nx * (yp + yy[n])] = fINQUEUE
              neigh[n] = fINQUEUE
              stack.push(Math.floor(pixelPos[xp + xx[n]][yp + yy[n]]))
            }
          }
        }

        // the third run
        // checks for new minima by considering all the pixels that were marked MASK
        // (the others were treated above)
        for (j = 0; j < h[gray] && !stop; j++) {
          // all the pixels of the same value
          pgray = pos[gray] + j
          xp = pixelX[pgray]
          yp = pixelY[pgray]
          if (outPixels[xp + nx * yp] === fMASK) {
            stop = currentLabel++ > MAXBASINS
            stack.push(pgray)
            outPixels[xp + nx * yp] = currentLabel
            while (stack.length && !stop) {
              p = stack[0]
              stack.shift()
              getNeighborhood34connect(pixelX[p], pixelY[p], neigh)
              for (n = 0; n < 4; n++) {
                if (neigh[n] === fMASK) {
                  xp = pixelX[p] + xx[n]
                  yp = pixelY[p] + yy[n]
                  stack.push(pixelPos[xp][yp])
                  outPixels[xp + nx * yp] = currentLabel
                }
              }
            } // while
          }
        }
        // gray is set to the next gray value ('if' for not get outside the table)
        if (pos[gray] + h[gray] < nx * ny - nx - nx - ny - ny + 4)
          gray = Math.floor(pixelValue[pos[gray] + h[gray]])
      }

      for (i = 0; i < nx; i++) {
        j = ny - 1
        outPixels[i] = WSHED
        outPixels[i + j * nx] = WSHED
      }
      for (j = 0; j < size; j += nx) {
        i = nx - 1
        outPixels[j] = WSHED
        outPixels[i + j] = WSHED
      }

      return output
    } //  END OF FLOODING

    /*
     * Get a 4-connected neighborhood
     *	In neigh[0] there is the pixel(x, y-1)
     *	In neigh[1] there is the pixel(x-1, y)
     *	In neigh[2] there is the pixel(x+1, y)
     *	In neigh[3] there is the pixel(x, y+1)
     *	In neigh[4] there is the pixel(x, y)	// central point
     */
    const getNeighborhood34connect = function(x, y, neigh) {
      let index = x + (y - 1) * nx
      neigh[0] = outPixels[index]
      index += nx - 1
      neigh[1] = outPixels[index]
      index += 2
      neigh[2] = outPixels[index]
      index += nx - 1
      neigh[3] = outPixels[index]
      index -= nx
      neigh[4] = outPixels[index]
    }

    const maxSize = Math.max(imgW, imgH)
    const imageNOCV = ImageAccess.fromHTMLImage(
      image,
      maxSize,
      maxSize,
      'stretch'
    )

    /* Create mesh and get ImageData mesh from ImageAccess img */
    const watershedImageAccess = blurToWatershed(imageNOCV)
    const watershedMesh = getOverlayImg(watershedImageAccess)
    const imgDataWatershed = getImageData(watershedMesh)

    return imgDataWatershed
  }

  const img = new Image()
  img.src = imgSrc
  await new Promise(resolve => (img.onload = resolve))

  const editedImageData = getImageDataFromImage(img)
  const resultImageData = getImageDataFromImage(img)

  // Get blurred gray image
  convertImageDataToGray(editedImageData)
  StackBlur.imageDataRGBA(
    editedImageData,
    0,
    0,
    editedImageData.width,
    editedImageData.height,
    blurValue
  )
  const blurredImage = getImageFromImageData(editedImageData)
  await new Promise(resolve => (blurredImage.onload = resolve))

  // Create mesh
  const watershedImageData = watershed(blurredImage, img.width, img.height)
  mergeMeshPixels(resultImageData, watershedImageData)

  // Modify image hue
  modifyImageHue(resultImageData)

  // Draw it
  const resultCanvas = document.createElement('canvas')
  const resultCanvasContext = resultCanvas.getContext('2d')
  resultCanvas.width = resultImageData.width
  resultCanvas.height = resultImageData.height

  const protectedImage = getImageFromImageData(resultImageData)
  await new Promise(resolve => (protectedImage.onload = resolve))
  const flip = Math.floor(Math.random() * 2) === 0
  resultCanvasContext.scale(flip ? -1 : 1, 1)
  resultCanvasContext.drawImage(
    protectedImage,
    flip ? resultImageData.width * -1 : 0,
    0,
    resultImageData.width,
    resultImageData.height
  )
  return resultCanvas.toDataURL()
}

export async function protectFlip({images}) {
  const protectedFlips = []
  const compressedImages = await Promise.all(
    images.map(image =>
      image
        ? Jimp.read(image).then(raw =>
            raw
              .resize(240, 180)
              .quality(60) // jpeg quality
              .getBase64Async('image/jpeg')
          )
        : image
    )
  )

  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < images.length; i++) {
    if (compressedImages[i]) {
      const protectedImageSrc = await protectFlipImage(compressedImages[i])
      protectedFlips[i] = protectedImageSrc
    } else {
      protectedFlips[i] = compressedImages[i]
    }
  }
  return {protectedImages: protectedFlips}
}

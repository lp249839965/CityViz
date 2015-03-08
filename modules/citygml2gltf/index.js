var fs = require('fs'),
	util = require('util'),
	assert = require('assert'),

	parser = require('xml2json'),
	earcut = require('earcut')


function inspect (item) {
	console.log(util.inspect(
		item,
		{
			depth: null,
			colors: true
		}
	))
}


function toBuffer (arrayBuffer) {

	var buffer,
		i,
		view

	if (Buffer && Buffer.isBuffer(arrayBuffer))
		return arrayBuffer

	else {
		buffer = new Buffer(arrayBuffer.byteLength)
		view = new Uint8Array(arrayBuffer)
		i = 0
		while (i < buffer.length) {
			buffer[i] = view[i]
			++i
		}
		return buffer
	}
}

function getOnlyProperty (object) {

	var keys = Object.keys(object)

	if (keys.length === 1)
		return object[keys[0]]
	else
		throw Error(
			JSON.stringify(object) +
			' has more than one property!'
		)
}

function getPosList (polygon, zeroPoint) {

	var coordsList = polygon
			['gml:Polygon']
			['gml:exterior']
			['gml:LinearRing']
			['gml:posList']
			.split(' '),
		coordObjects = [],
		arrayStyle = true,
		i

	for (i = 0; i < coordsList.length; i += 3) {
		if (arrayStyle)
			coordObjects.push([
				coordsList[i] - zeroPoint.x,
				coordsList[i + 1] - zeroPoint.y,
				coordsList[i + 2] - zeroPoint.z
			])
		else
			coordObjects.push({
				x: coordsList[i] - zeroPoint.x,
				y: coordsList[i + 1] - zeroPoint.y,
				z: coordsList[i + 2] - zeroPoint.z
			})
	}

	assert.deepEqual(coordObjects[0], coordObjects.pop())

	return coordObjects
}

function surfacesToBufferObject (surfaceTypes) {

	var coordinates = new Float32Array(Array.prototype.concat.apply(
			[],
			surfaceTypes.map(function (surfaceType) {

				var flattedSurfaces = surfaceType.surfaces.map(
					function (surface) {

						return Array.prototype
							.concat
							.apply([], surface)
					}
				)

				return Array.prototype.concat.apply(
					[], flattedSurfaces
				)
			})
		)),
		coordinateBuffer = toBuffer(coordinates.buffer)


	return {
		byteLength: coordinates.length * 4,
		type: 'arraybuffer',
		uri:        'data:application/octet-stream;base64,' +
		            coordinateBuffer.toString('base64')
	}


}

function getAccessors (options) {
	return {
		'accessor-01': {
			bufferView: "bufferView_01",
			byteOffset: 0,
			byteStride: 0,
			componentType: 5126, // Float
			count: options.count,
			type: "VEC3"
		}
	}
}


function getPasses (options) {

	return {
		defaultPass: {
			details: {
				type: "COLLADA-1.4.1/commonProfile",
				commonProfile: {
					extras: {
						doubleSided: false
					},
					lightingModel: "Phong",
					parameters: [
						"diffuse",
						"modelViewMatrix",
						"normalMatrix",
						"projectionMatrix",
						"shininess",
						"specular"
					]
				}
			},
			instanceProgram: {
				attributes: {
					a_normal: "normal",
					a_position: "position"
				},
				program: "program_0",
				uniforms: {
					u_diffuse: "diffuse",
					u_modelViewMatrix: "modelViewMatrix",
					u_normalMatrix: "normalMatrix",
					u_projectionMatrix: "projectionMatrix",
					u_shininess: "shininess",
					u_specular: "specular"
				}
			},
			states: {
				enable: [
					2884,
					2929
				]
			}
		}
	}
}

function convert (buildings, options) {

	return buildings
		.map(function (building, index) {

			//if (index > 1)
			//	return 0

			//console.log(JSON.stringify(building,null,2))

			var surfaceTypes = building['bldg:Building']['bldg:boundedBy']
					.map(function (surfaceType) {

						var surfaces,
							Polygons = getOnlyProperty(surfaceType)
								['bldg:lod2MultiSurface']
								['gml:MultiSurface']
								['gml:surfaceMember']


						if (Array.isArray(Polygons)) {
							surfaces = Polygons.map(function (polygon) {
								return getPosList(polygon, options.zeroPoint)
							})
						}
						else {
							// Polygons is just one polygon object
							surfaces = [getPosList(Polygons, options.zeroPoint)]
						}

						return {
							surfaceType: Object.keys(surfaceType)[0],
							surfaces: surfaces.map(function (surface) {
								return surface
								//return earcut(surface)
							})
						}
					}),
				buildingBuffer = surfacesToBufferObject(surfaceTypes)


			return {
				gmlid: building['bldg:Building']['gml:id'],
				terrainHeight: building['bldg:Building']
					['gen:doubleAttribute']['gen:value'],
				gltf: {
					accessors: getAccessors({count: buildingBuffer.byteLength}),
					asset: {},
					buffers: {
						building: buildingBuffer
					},
					bufferViews: {
						bufferView_01: {
							buffer: "building",
							byteLength: buildingBuffer.byteLength,
							byteOffset: 0,
							target: 34962
						}
					},
					cameras: {
						camera1: {
							perspective: {
								aspect_ratio: 1.5,
								yfov: 37.8492,
								zfar: 100,
								znear: 0.01
							},
							type: 'perspective'
						}
					},
					images: {},
					lights: {
						directionalLight1: {
							directional: {
								color: [
									1,
									1,
									1
								]
							},
							type: "directional"
						}
					},
					materials: {
						material_01: {
							name: "Material 1",
							instanceTechnique: {
								technique: "technique1",
								values: {
									diffuse: [
										0.8,
										0,
										0,
										1
									],
									shininess: 256,
									specular: [
										0.2,
										0.2,
										0.2,
										1
									]
								}
							}
						}
					},
					meshes: {
						buildingMesh: {
							name: "Building Mesh",
							primitives: [
								{
									attributes: {
										NORMAL: "accessor-01",
										POSITION: "accessor-01",
										TEXCOORD_0: "accessor-01"
									},
									indices: "accessor-01",
									material: "material_01",
									primitive: 2 // Line loop
								}
							]
						}
					},
					nodes: {
						building: {
							name: 'Building',
							meshes: [
								'buildingMesh'
							]
						}
						//,
						//camera1: {
						//	camera: 'camera1',
						//	name: 'Camera 1'
						//},
						//directionalLight1: {
						//	light: 'directionalLight1',
						//	name: 'Directional Light 1'
						//}
					},
					programs: {
						program_0: {
							attributes: [
								"a_normal",
								"a_position"
							],
							fragmentShader: "building_FS",
							vertexShader: "building_VS"
						}
					},
					//samplers: {},
					scene: 'defaultScene',
					scenes: {
						defaultScene: {
							nodes: [
								'building',
								//'camera1',
								//'directionalLight1'
							]
						}
					},
					shaders: {
						building_FS: {
							type: 35632,
							uri: "/shaders/building_FS.glsl"
						},
						building_VS: {
							type: 35633,
							uri: "/shaders/building_VS.glsl"
						}
					},
					skins: {},
					textures: {},
					techniques: {
						technique1: {
							parameters: {
								diffuse: {
									type: 35666
								},
								modelViewMatrix: {
									semantic: "MODELVIEW",
									type: 35676
								},
								normal: {
									semantic: "NORMAL",
									type: 35665
								},
								normalMatrix: {
									semantic: "MODELVIEWINVERSETRANSPOSE",
									type: 35675
								},
								position: {
									semantic: "POSITION",
									type: 35665
								},
								projectionMatrix: {
									semantic: "PROJECTION",
									type: 35676
								},
								shininess: {
									type: 5126
								},
								specular: {
									type: 35666
								}
							},
							pass: "defaultPass",
							passes: getPasses()
						}
					}
				}
			}
		})
}


module.exports = function (options, callback) {

	var zeroCoords = [],
		zeroPoint,
		inputAsJson,
		inputAsXml,
		buildings,
		output

	if (Buffer.isBuffer(options))
		inputAsXml = options
	else
		inputAsXml = fs.readFileSync(options.inputFile)

	try {
		inputAsJson = parser.toJson(inputAsXml, {
			object: true
		})

		zeroCoords = inputAsJson.CityModel['gml:boundedBy']['gml:Envelope']
			['gml:lowerCorner'].split(' ')

		zeroPoint = {
			x: zeroCoords[0],
			y: zeroCoords[1],
			z: zeroCoords[2]
		}

		buildings = convert(
			inputAsJson.CityModel.cityObjectMember,
			{zeroPoint: zeroPoint}
		)
	}
	catch (error) {
		return callback(error)
	}

	if (options.outputFile) {

		if (options.beautify)
			output = JSON.stringify(buildings, null, 4)
		else
			output = JSON.stringify(buildings)

		fs.writeFileSync(options.outputFile, output)
		return callback()
	}

	callback(null, buildings)
}
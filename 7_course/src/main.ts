import * as THREE from 'three';
import { loadEnvMap } from './envMap';

const {
	BufferGeometry,
	Float32BufferAttribute,
	Vector2,
	Vector3,
} = THREE;

const radialSegments = 2;

// helper variables
let P = new Vector3();
const normal = new Vector3();
const binormal = new Vector3();
const tangent = new Vector3();
const vertex = new Vector3();
const uv = new Vector2();

class RibbonGeometry extends BufferGeometry {

	tangents: THREE.Vector3[] = [];
	normals: THREE.Vector3[] = [];
	binormals: THREE.Vector3[] = [];
	type = 'RibbonGeometry';

	constructor( path: THREE.CurvePath<THREE.Vector3>, ribbonSegments = 64, ribbonWidth = 1, closed = false ) {

		super();

		const ribbonWidthHalf = ribbonWidth / 2;
		const frames = path.computeFrenetFrames( ribbonSegments, closed );

		// expose internals
		this.tangents = frames.tangents;
		this.normals = frames.normals;
		this.binormals = frames.binormals;

		// buffer

		const vertices: number[] = [];
		const normals: number[] = [];
		const uvs: number[] = [];
		const indices: number[] = [];

		// create buffer data

		generateBufferData();

		// build geometry

		this.setIndex( indices );
		this.setAttribute( 'position', new Float32BufferAttribute( vertices, 3 ) );
		this.setAttribute( 'normal', new Float32BufferAttribute( normals, 3 ) );
		this.setAttribute( 'uv', new Float32BufferAttribute( uvs, 2 ) );

		// functions

		function generateBufferData() {

			for ( let i = 0; i < ribbonSegments; i ++ ) {

				generateSegment( i );

			}

			generateSegment( ( closed === false ) ? ribbonSegments : 0 );
			generateUVs();
			generateIndices();

		}

		function generateSegment( i: number ) {

			// we use getPointAt to sample evenly distributed points from the given path
			const progressAlongThePath = i / ribbonSegments;
			P = path.getPointAt( progressAlongThePath, P );

			// retrieve corresponding normal and binormal

			normal.copy( frames.normals[ i ] )//.applyQuaternion( faceRotation );
			binormal.copy( frames.binormals[ i ] )//.applyQuaternion( faceRotation );
			tangent.copy( frames.tangents[ i ] );

			// generate normals and vertices for the current segment

			for ( let j = 0; j <= radialSegments; j ++ ) {

				// normal
				normals.push( - normal.x, - normal.y, - normal.z );

				// vertex
				const v = j / radialSegments * Math.PI * 2;

				const sin = Math.sin( v );
				const cos = - Math.cos( v );

				vertex.x = P.x + ribbonWidthHalf * ( sin * normal.x + cos * binormal.x );
				vertex.y = P.y + ribbonWidthHalf * ( sin * normal.y + cos * binormal.y );
				vertex.z = P.z + ribbonWidthHalf * ( sin * normal.z + cos * binormal.z );

				vertices.push( vertex.x, vertex.y, vertex.z );

			}

		}

		function generateIndices() {

			for ( let j = 1; j <= ribbonSegments; j ++ ) {

				for ( let i = 1; i <= radialSegments - 1; i ++ ) {

					const a = ( radialSegments + 1 ) * ( j - 1 ) + ( i - 1 );
					const b = ( radialSegments + 1 ) * j + ( i - 1 );
					const c = ( radialSegments + 1 ) * j + i;
					const d = ( radialSegments + 1 ) * ( j - 1 ) + i;

					// faces

					indices.push( a, b, d );
					indices.push( b, c, d );

				}

			}

		}

		function generateUVs() {

			for ( let i = 0; i <= ribbonSegments; i ++ ) {

				for ( let j = 0; j <= radialSegments; j ++ ) {

					uv.x = 1 - j / ( radialSegments - 1 );
					uv.y = i / ribbonSegments;

					uvs.push( uv.x, uv.y );

				}

			}

		}

	}

};






const width  = window.innerWidth;
const height = window.innerHeight;
const clock = new THREE.Clock();
const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 60, width / height, 0.01, 100 );
const renderer = new THREE.WebGLRenderer();
renderer.setSize( width, height );
document.body.appendChild( renderer.domElement );

loadEnvMap( renderer ).then( ( envMapRenderTarget ) => {

	scene.environment = envMapRenderTarget.texture;

} );

scene.add(
	new THREE.HemisphereLight( 0x443333, 0x332222 ),
	new THREE.AmbientLight( 0x999999 ),
);

const curvePath: THREE.CurvePath<THREE.Vector3> = new THREE.CurvePath();
curvePath.add( new THREE.CatmullRomCurve3( [
	new THREE.Vector3( 0, 0, 0 ),
	new THREE.Vector3( 0, 0, 0.1 ),
	new THREE.Vector3( 0, 0, 1 ),
	new THREE.Vector3( 0, 2, 5 ),
	// new THREE.Vector3( 0, 0, 6 ),
	new THREE.Vector3( 2, 2, 6 ),
	new THREE.Vector3( 2, 2, 0 ),
	// new THREE.Vector3( 0, 0, 0 ),
	new THREE.Vector3( 0, 2, 0 ),
	new THREE.Vector3( -1, 2, 0 ),
	new THREE.Vector3( -5, 0, -5 ),
	new THREE.Vector3( 0, 0, -5 ),
	new THREE.Vector3( 0, 0, -1 ),
] ) );

const colorMap = new THREE.TextureLoader().load( './/TwoLaneRoadPatches02_1K_BaseColor.png' );
const normalMap = new THREE.TextureLoader().load( './/TwoLaneRoadPatches02_1K_Normal.png' );
const roughnessMap = new THREE.TextureLoader().load( './/TwoLaneRoadPatches02_1K_Roughness.png' );

colorMap.repeat.set( 1, 20 );
colorMap.wrapT = THREE.RepeatWrapping;
normalMap.repeat.copy( colorMap.repeat );
normalMap.wrapT = colorMap.wrapT;
roughnessMap.repeat.copy( colorMap.repeat );
roughnessMap.wrapT = colorMap.wrapT;

const mesh = new THREE.Mesh(
	new RibbonGeometry( curvePath, 120, 1, true ),
	// new THREE.MeshNormalMaterial(),
	// new THREE.MeshBasicMaterial( { map: uvMap, side: THREE.DoubleSide } ),
	new THREE.MeshStandardMaterial( {
		map: colorMap,
		normalMap,
		roughnessMap,
		side: THREE.DoubleSide
	} ),
);
scene.add( mesh );


scene.add( new THREE.Mesh( new THREE.BoxGeometry( .5, .5, .5 ), new THREE.MeshNormalMaterial() ) );

const gridHelper = new THREE.GridHelper( 50, 50 );
scene.add( gridHelper );

renderer.render( scene, camera );

( function anim () {

	const delta = clock.getDelta();
	const elapsed = clock.getElapsedTime();

	if ( elapsed > 30 ) { return; }

	requestAnimationFrame( anim );

	camera.position.set(
		Math.sin( elapsed * .5 ) * 4,
		3,
		Math.cos( elapsed * .5 ) * 4
	);
	camera.lookAt( 0, 0, 0 );
	renderer.render( scene, camera );

} )();

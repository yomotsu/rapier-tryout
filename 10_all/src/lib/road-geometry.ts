import * as THREE from 'three';

const radialSegments = 2;

// helper variables
let P = new THREE.Vector3();
const normal = new THREE.Vector3();
const binormal = new THREE.Vector3();
const tangent = new THREE.Vector3();
const vertex = new THREE.Vector3();
const uv = new THREE.Vector2();

export class RoadGeometry extends THREE.BufferGeometry {

	tangents: THREE.Vector3[];
	normals: THREE.Vector3[];
	binormals: THREE.Vector3[];
	type = 'RoadGeometry';

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
		this.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
		this.setAttribute( 'normal', new THREE.Float32BufferAttribute( normals, 3 ) );
		this.setAttribute( 'uv', new THREE.Float32BufferAttribute( uvs, 2 ) );

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

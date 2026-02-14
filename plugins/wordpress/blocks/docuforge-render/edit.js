/**
 * DocuForge Render Block - Editor Component
 *
 * Provides the block editor interface for selecting templates,
 * configuring data fields, and previewing rendered PDFs.
 *
 * @package DocuForge
 * @since   1.0.0
 */

import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	PanelRow,
	SelectControl,
	TextControl,
	Button,
	Placeholder,
	Spinner,
	Notice,
} from '@wordpress/components';
import { useState, useEffect, useCallback } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';

/**
 * Edit component for the DocuForge render block.
 *
 * @param {Object}   props               Block props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {JSX.Element} Block editor UI.
 */
export default function Edit( { attributes, setAttributes } ) {
	const { templateId, output, data, width, height } = attributes;
	const blockProps = useBlockProps();

	const [ templates, setTemplates ] = useState( [] );
	const [ loading, setLoading ] = useState( true );
	const [ error, setError ] = useState( '' );
	const [ templateDetails, setTemplateDetails ] = useState( null );
	const [ previewUrl, setPreviewUrl ] = useState( '' );
	const [ previewing, setPreviewing ] = useState( false );

	// Fetch available templates on mount.
	useEffect( () => {
		setLoading( true );
		apiFetch( { path: '/docuforge/v1/templates?limit=100' } )
			.then( ( response ) => {
				const items = response.templates || response.data || response || [];
				setTemplates( Array.isArray( items ) ? items : [] );
				setError( '' );
			} )
			.catch( ( err ) => {
				setError(
					err.message ||
						__(
							'Failed to load templates. Check your API configuration.',
							'docuforge'
						)
				);
				setTemplates( [] );
			} )
			.finally( () => setLoading( false ) );
	}, [] );

	// Fetch template details when selection changes.
	useEffect( () => {
		if ( ! templateId ) {
			setTemplateDetails( null );
			return;
		}

		apiFetch( { path: `/docuforge/v1/templates/${ templateId }` } )
			.then( ( response ) => {
				setTemplateDetails( response );

				// Auto-populate data fields from template defaults.
				if ( response.fields || response.defaults || response.schema ) {
					const fields =
						response.fields ||
						response.defaults ||
						response.schema ||
						{};
					const newData = { ...data };

					Object.keys( fields ).forEach( ( key ) => {
						if ( ! ( key in newData ) ) {
							newData[ key ] =
								typeof fields[ key ] === 'object'
									? fields[ key ].default || ''
									: String( fields[ key ] );
						}
					} );

					setAttributes( { data: newData } );
				}
			} )
			.catch( () => {
				setTemplateDetails( null );
			} );
	}, [ templateId ] ); // eslint-disable-line react-hooks/exhaustive-deps

	/**
	 * Handles the preview button click.
	 */
	const handlePreview = useCallback( () => {
		if ( ! templateId ) {
			return;
		}

		setPreviewing( true );
		setPreviewUrl( '' );

		apiFetch( {
			path: '/docuforge/v1/render',
			method: 'POST',
			data: {
				template_id: templateId,
				data: data || {},
			},
		} )
			.then( ( response ) => {
				if ( response.url ) {
					setPreviewUrl( response.url );
				}
			} )
			.catch( ( err ) => {
				setError(
					err.message ||
						__( 'Failed to render preview.', 'docuforge' )
				);
			} )
			.finally( () => setPreviewing( false ) );
	}, [ templateId, data ] );

	/**
	 * Updates a single data field.
	 *
	 * @param {string} key   Field key.
	 * @param {string} value Field value.
	 */
	const updateDataField = ( key, value ) => {
		setAttributes( {
			data: {
				...data,
				[ key ]: value,
			},
		} );
	};

	/**
	 * Adds a new data field.
	 */
	const addDataField = () => {
		const key = `field_${ Object.keys( data || {} ).length + 1 }`;
		setAttributes( {
			data: {
				...data,
				[ key ]: '',
			},
		} );
	};

	/**
	 * Removes a data field.
	 *
	 * @param {string} key Field key to remove.
	 */
	const removeDataField = ( key ) => {
		const newData = { ...data };
		delete newData[ key ];
		setAttributes( { data: newData } );
	};

	// Build template options for SelectControl.
	const templateOptions = [
		{ label: __( '-- Select a Template --', 'docuforge' ), value: '' },
		...templates.map( ( tpl ) => ( {
			label: tpl.name || tpl.id,
			value: tpl.id,
		} ) ),
	];

	return (
		<div { ...blockProps }>
			<InspectorControls>
				<PanelBody
					title={ __( 'Template Settings', 'docuforge' ) }
					initialOpen={ true }
				>
					<SelectControl
						label={ __( 'Template', 'docuforge' ) }
						value={ templateId }
						options={ templateOptions }
						onChange={ ( value ) =>
							setAttributes( { templateId: value } )
						}
					/>

					<SelectControl
						label={ __( 'Output Mode', 'docuforge' ) }
						value={ output }
						options={ [
							{
								label: __( 'Embed (iframe)', 'docuforge' ),
								value: 'embed',
							},
							{
								label: __(
									'Download Link',
									'docuforge'
								),
								value: 'download',
							},
						] }
						onChange={ ( value ) =>
							setAttributes( { output: value } )
						}
					/>

					{ output === 'embed' && (
						<>
							<TextControl
								label={ __( 'Width', 'docuforge' ) }
								value={ width }
								onChange={ ( value ) =>
									setAttributes( { width: value } )
								}
								help={ __(
									'CSS width value (e.g., 100%, 800px)',
									'docuforge'
								) }
							/>
							<TextControl
								label={ __( 'Height', 'docuforge' ) }
								value={ height }
								onChange={ ( value ) =>
									setAttributes( { height: value } )
								}
								help={ __(
									'CSS height value (e.g., 600px)',
									'docuforge'
								) }
							/>
						</>
					) }
				</PanelBody>

				<PanelBody
					title={ __( 'Template Data', 'docuforge' ) }
					initialOpen={ false }
				>
					{ data &&
						Object.entries( data ).map(
							( [ key, value ] ) => (
								<PanelRow key={ key }>
									<div
										style={ {
											display: 'flex',
											gap: '8px',
											alignItems: 'flex-end',
											width: '100%',
										} }
									>
										<TextControl
											label={ key }
											value={ value }
											onChange={ ( val ) =>
												updateDataField( key, val )
											}
											help={ __(
												'Use {post:title}, {post_meta:field} for dynamic values.',
												'docuforge'
											) }
											style={ { flex: 1 } }
										/>
										<Button
											isDestructive
											variant="secondary"
											size="small"
											onClick={ () =>
												removeDataField( key )
											}
											style={ {
												marginBottom: '8px',
											} }
										>
											{ __( 'Remove', 'docuforge' ) }
										</Button>
									</div>
								</PanelRow>
							)
						) }

					<Button
						variant="secondary"
						onClick={ addDataField }
						style={ { marginTop: '8px' } }
					>
						{ __( 'Add Data Field', 'docuforge' ) }
					</Button>
				</PanelBody>
			</InspectorControls>

			{ error && (
				<Notice
					status="error"
					isDismissible={ true }
					onDismiss={ () => setError( '' ) }
				>
					{ error }
				</Notice>
			) }

			{ loading ? (
				<Placeholder
					icon="pdf"
					label={ __( 'DocuForge PDF', 'docuforge' ) }
				>
					<Spinner />
					<p>{ __( 'Loading templates...', 'docuforge' ) }</p>
				</Placeholder>
			) : ! templateId ? (
				<Placeholder
					icon="pdf"
					label={ __( 'DocuForge PDF', 'docuforge' ) }
					instructions={ __(
						'Select a template from the sidebar to render a PDF.',
						'docuforge'
					) }
				>
					<SelectControl
						value={ templateId }
						options={ templateOptions }
						onChange={ ( value ) =>
							setAttributes( { templateId: value } )
						}
					/>
				</Placeholder>
			) : (
				<div className="docuforge-block-preview">
					<div className="docuforge-block-header">
						<span className="docuforge-block-icon">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
								<polyline points="14 2 14 8 20 8" />
							</svg>
						</span>
						<span className="docuforge-block-title">
							{ __( 'DocuForge PDF', 'docuforge' ) }
						</span>
						<span className="docuforge-block-template-id">
							{ templateId }
						</span>
					</div>

					{ templateDetails && (
						<div className="docuforge-block-details">
							{ templateDetails.name && (
								<p>
									<strong>
										{ __( 'Template:', 'docuforge' ) }
									</strong>{ ' ' }
									{ templateDetails.name }
								</p>
							) }
							{ templateDetails.description && (
								<p>{ templateDetails.description }</p>
							) }
						</div>
					) }

					<div className="docuforge-block-actions">
						<Button
							variant="primary"
							onClick={ handlePreview }
							disabled={ previewing }
						>
							{ previewing ? (
								<>
									<Spinner />
									{ __(
										'Rendering...',
										'docuforge'
									) }
								</>
							) : (
								__( 'Preview PDF', 'docuforge' )
							) }
						</Button>
						<span className="docuforge-block-output-mode">
							{ output === 'embed'
								? __( 'Embedded', 'docuforge' )
								: __( 'Download Link', 'docuforge' ) }
						</span>
					</div>

					{ previewUrl && (
						<div className="docuforge-block-iframe-wrap">
							<iframe
								src={ previewUrl }
								width={ width }
								height={ height }
								title={ __(
									'PDF Preview',
									'docuforge'
								) }
								style={ { border: 'none' } }
							/>
						</div>
					) }
				</div>
			) }
		</div>
	);
}

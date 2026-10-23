import SlideView from './SlideView.jsx';

// Keep the source DOM (including its video and layers) until the mounted
// destination reports readiness. The destination node is then promoted intact.
export default function EditorVideoScene({page, pages, interaction, playback, videoSurface, ...props}) {
  const source=playback?.page;
  const slots=source && source.id!==page.id ? [source,page] : [page];
  return slots.map(item=>{
    const departing=!!source && item.id===source.id;
    const preparing=!!source && item.id!==source.id;
    return <div key={item.id} className={`editor-video-slot ${preparing?'is-preparing':''}`} inert={preparing?true:undefined} aria-hidden={preparing?true:undefined}>
      <SlideView {...props} page={item} number={pages.findIndex(p=>p.id===item.id)+1} interaction={item.id===page.id?interaction:interaction.forPage(item)} onBackgroundReady={item.id===page.id?props.onBackgroundReady:undefined} videoSurface={departing?videoSurface:null} videoLayers={departing?playback.videoLayers:null} buttonEditing={preparing?{playbackEnabled:false,disabled:true}:props.buttonEditing}/>
    </div>;
  });
}

(() => {
  const $ = id => document.getElementById(id), fmt = iso => new Date(iso).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'medium'});
  if ($('alertType')) return mobileApp();

  let stream, monitoring=false, closedAt=null, alerted=false, editingId=null, sessionId=null, audioContext=null;
  const video=$('webcam'), canvas=$('overlay'), ctx=canvas.getContext('2d');

  OccurrenceStore.seed();
  Realtime.init();
  render();

  $('threshold').oninput=()=> $('thresholdOut').textContent=`${$('threshold').value} s`;
  $('startBtn').onclick=start;
  $('stopBtn').onclick=stop;
  $('connectBtn').onclick=connect;
  $('newMockBtn').onclick=()=>{
    OccurrenceStore.create({duration:3.2,alertType:'bip',message:'Ocorrência de teste'});
    render();
  };
  $('arBtn').onclick=()=> $('arStage').classList.toggle('hidden');
  $('saveEdit').onclick=()=>{
    OccurrenceStore.update(editingId,{
      duration:Number($('editDuration').value),
      message:$('editMessage').value
    });
    render();
  };

  async function start(){
    try{
      audioContext ??= new (window.AudioContext||window.webkitAudioContext)();
      await audioContext.resume();

      stream=await navigator.mediaDevices.getUserMedia({
        video:{facingMode:'user'},
        audio:false
      });

      video.srcObject=stream;
      await video.play();

      canvas.width=video.videoWidth;
      canvas.height=video.videoHeight;

      $('noCamera').classList.add('hidden');
      setStatus('camera','conectada',true);

      monitoring=true;
      $('startBtn').disabled=true;
      $('stopBtn').disabled=false;

      await FaceDetector.load(video,frame);
    }catch(e){
      stream?.getTracks().forEach(t=>t.stop());
      monitoring=false;
      $('startBtn').disabled=false;
      $('stopBtn').disabled=true;

      alert(`Não foi possível iniciar o reconhecimento. Atualize a página e autorize a câmera. Detalhe: ${e.message}`);
    }
  }

  function stop(){
    if(alerted) Realtime.sendAlert({active:false});

    monitoring=false;
    FaceDetector.stop();
    stream?.getTracks().forEach(t=>t.stop());
    video.srcObject=null;

    closedAt=null;
    alerted=false;

    setStatus('camera','desligada',false);
    setStatus('face','não detectado',false);
    setStatus('alert','inativo',false);

    $('globalAlert').textContent='Monitoramento seguro';
    $('globalAlert').classList.remove('active');

    $('startBtn').disabled=false;
    $('stopBtn').disabled=true;

    ctx.clearRect(0,0,canvas.width,canvas.height);
  }

  function frame(data){
    if(!monitoring) return;

    ctx.clearRect(0,0,canvas.width,canvas.height);

    if(!data){
      setStatus('face','não detectado',false);
      closedAt=null;
      return;
    }

    setStatus('face','detectado',true);
    draw(data.landmarks);

    const closed=data.leftEye<.19&&data.rightEye<.19;

    if(closed){
      if(!closedAt) closedAt=Date.now();

      const sec=(Date.now()-closedAt)/1000;
      $('closedTimer').textContent=`${sec.toFixed(1)} s`;

      if(sec>=Number($('threshold').value)&&!alerted) trigger(sec);
    }else{
      if(alerted) Realtime.sendAlert({active:false});

      closedAt=null;
      alerted=false;

      $('closedTimer').textContent='0.0 s';
      setStatus('alert','inativo',false);

      $('globalAlert').textContent='Monitoramento seguro';
      $('globalAlert').classList.remove('active');
    }
  }

  function draw(lm){
    ctx.strokeStyle='#a78bfa';
    ctx.lineWidth=3;

    [33,133,159,145,362,263,386,374,13,14,78,308].forEach(i=>{
      const p=lm[i];
      ctx.beginPath();
      ctx.arc(p.x*canvas.width,p.y*canvas.height,4,0,Math.PI*2);
      ctx.stroke();
    });
  }

  function trigger(sec){
    alerted=true;

    const phone=Realtime.getMobileSettings();

    const occurrence=OccurrenceStore.create({
      duration:Number(sec.toFixed(1)),
      alertType:phone.alertType||'bip',
      message:phone.message||'Atenção: olhos fechados por tempo excessivo.'
    });

    render();

    setStatus('alert','ATIVO',true,'alert');
    $('globalAlert').textContent='⚠ ALERTA DE SONOLÊNCIA DETECTADO';
    $('globalAlert').classList.add('active');

    beep();

    Realtime.sendAlert({
      ...occurrence,
      active:true
    });
  }

  function beep(){
    const ac=audioContext||new (window.AudioContext||window.webkitAudioContext)();
    const o=ac.createOscillator();
    const g=ac.createGain();

    o.connect(g);
    g.connect(ac.destination);

    o.frequency.value=880;
    g.gain.value=.12;

    o.start();
    setTimeout(()=>o.stop(),700);
  }

  function connect(){
    sessionId=crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2);

    const url=new URL('mobile.html',location.href);
    url.searchParams.set('session',sessionId);

    $('qrcode').innerHTML='';
    new QRCode($('qrcode'),{text:url.href,width:170,height:170});

    $('sessionCode').textContent=`Sessão: ${sessionId.slice(0,8)}`;
    $('qrArea').classList.remove('hidden');

    Realtime.startSession(
      sessionId,
      yes=>setStatus('phone',yes?'conectado':'aguardando',yes)
    );

    if(!Realtime.enabled()){
      $('firebaseHint').textContent='QR gerado. Para receber alertas, copie firebase-config.example.js para firebase-config.js e configure o Firebase.';
    }
  }

  function setStatus(key,text,on,kind=''){
    $(`${key}Status`).textContent=text;

    const dot=$(`${key}Dot`);
    dot.className=`dot ${on?(kind||'on'):''}`;

    if(key==='camera'){
      $('cameraBadge').textContent=on?'Câmera conectada':'Câmera desligada';
      $('cameraBadge').className=`badge ${on?'on':'off'}`;
    }
  }

  function render(){
    const data=OccurrenceStore.getAll();
    const tbody=$('occurrences');

    tbody.innerHTML=data.length
      ?data.map(x=>`
        <tr>
          <td>${fmt(x.createdAt)}</td>
          <td>${x.duration}s</td>
          <td>${x.alertType}</td>
          <td><span class="tag ${x.status}">${x.status}</span></td>
          <td>
            <div class="small-actions">
              <button data-review="${x.id}">Revisar</button>
              <button data-edit="${x.id}">Editar</button>
              <button data-delete="${x.id}" class="danger">Excluir</button>
            </div>
          </td>
        </tr>
      `).join('')
      :'<tr><td colspan="5">Nenhuma ocorrência.</td></tr>';

    tbody.querySelectorAll('[data-review]').forEach(b=>b.onclick=()=>{
      OccurrenceStore.update(b.dataset.review,{status:'revisado'});
      render();
    });

    tbody.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{
      if(confirm('Excluir esta ocorrência?')){
        OccurrenceStore.remove(b.dataset.delete);
        render();
      }
    });

    tbody.querySelectorAll('[data-edit]').forEach(b=>{
      const x=data.find(a=>a.id===b.dataset.edit);

      editingId=x.id;
      $('editDuration').value=x.duration;
      $('editMessage').value=x.message;
      $('editDialog').showModal();
    });

    drawCards(data);
  }

  function drawCards(data){
    const make=(x,i,ar=false)=>`
      <a-entity
        class="virtual-card"
        data-id="${x.id}"
        position="${(i%3-1)*1.7} ${1.5-Math.floor(i/3)*.8} ${ar?0:-2}"
        rotation="0 ${ar?0:(i%2?12:-12)} 0">
        <a-plane width="1.45" height=".62" color="${x.status==='novo'?'#c73752':'#167b57'}"></a-plane>
        <a-text
          value="${x.status.toUpperCase()}\n${x.duration}s • ${x.alertType}"
          align="center"
          width="1.3"
          position="0 0 .02"
          color="#fff"></a-text>
      </a-entity>
    `;

    $('vrCards').innerHTML=data.map((x,i)=>make(x,i)).join('');

    const ar=$('arCards');
    if(ar) ar.innerHTML=data.slice(0,3).map((x,i)=>make(x,i,true)).join('');

    document.querySelectorAll('.virtual-card').forEach(el=>{
      el.addEventListener('click',()=>{
        OccurrenceStore.update(el.dataset.id,{status:'revisado'});
        render();
      });
    });
  }

  function mobileApp(){
    const session=new URLSearchParams(location.search).get('session');
    const type=$('alertType');

    let recorder,chunks=[],recordUrl='',uploadUrl='',alertTimer=null;

    Realtime.init();

    $('mobileStatus').textContent=
      session&&Realtime.connectMobile(session,{connected:true})
        ?'Celular conectado e pronto para alertas.'
        :'Firebase não configurado ou QR inválido.';

    const toggle=()=>{
      $('speechControls').classList.toggle('hidden',type.value!=='speech');
      $('recordControls').classList.toggle('hidden',type.value!=='recording');
      $('uploadControls').classList.toggle('hidden',type.value!=='upload');
    };

    type.onchange=toggle;
    toggle();

    function settings(){
      return {
        alertType:type.value,
        message:$('speechText').value
      };
    }

    function stopPhoneAlert(){
      clearInterval(alertTimer);
      alertTimer=null;

      speechSynthesis.cancel();

      ['recordedAudio','uploadedAudio'].forEach(id=>{
        const audio=$(id);

        if(audio){
          audio.pause();
          audio.currentTime=0;
          audio.loop=false;
        }
      });
    }

    function beepPhone(){
      const ac=new (window.AudioContext||window.webkitAudioContext)();
      const o=ac.createOscillator();
      const g=ac.createGain();

      o.connect(g);
      g.connect(ac.destination);

      o.frequency.value=880;
      g.gain.value=.15;
      o.start();

      setTimeout(()=>{
        o.stop();
        ac.close();
      },500);
    }

    function play(){
      stopPhoneAlert();

      const s=settings();
      navigator.vibrate?.([250,100,250]);

      if(s.alertType==='speech'){
        const speak=()=>{
          speechSynthesis.cancel();
          speechSynthesis.speak(new SpeechSynthesisUtterance(s.message));
        };

        speak();
        alertTimer=setInterval(speak,3000);

      }else if(s.alertType==='recording'&&recordUrl){
        const audio=$('recordedAudio');

        audio.loop=true;
        audio.currentTime=0;
        audio.play().catch(()=>{});

      }else if(s.alertType==='upload'&&uploadUrl){
        const audio=$('uploadedAudio');

        audio.loop=true;
        audio.currentTime=0;
        audio.play().catch(()=>{});

      }else{
        beepPhone();
        alertTimer=setInterval(beepPhone,800);
      }
    }

    $('testBtn').onclick=()=>{
      play();
      setTimeout(stopPhoneAlert,3000);
    };

    $('activateBtn').onclick=()=>{
      Realtime.saveSettings({
        ...settings(),
        active:true
      });

      $('mobileStatus').textContent='Alertas ativados no celular.';
    };

    $('audioFile').onchange=e=>{
      uploadUrl=URL.createObjectURL(e.target.files[0]);
      $('uploadedAudio').src=uploadUrl;
    };

    $('recordBtn').onclick=async()=>{
      const s=await navigator.mediaDevices.getUserMedia({audio:true});

      chunks=[];
      recorder=new MediaRecorder(s);

      recorder.ondataavailable=e=>chunks.push(e.data);

      recorder.onstop=()=>{
        recordUrl=URL.createObjectURL(
          new Blob(chunks,{
            type:recorder.mimeType||chunks[0]?.type||'audio/mp4'
          })
        );

        $('recordedAudio').src=recordUrl;
        s.getTracks().forEach(t=>t.stop());
      };

      recorder.start();

      $('recordBtn').disabled=true;
      $('stopRecordBtn').disabled=false;
    };

    $('stopRecordBtn').onclick=()=>{
      recorder?.stop();
      $('recordBtn').disabled=false;
      $('stopRecordBtn').disabled=true;
    };

    $('playRecordBtn').onclick=()=>{
      const audio=$('recordedAudio');

      audio.loop=false;
      audio.currentTime=0;
      audio.play();
    };

    $('deleteRecordBtn').onclick=()=>{
      stopPhoneAlert();
      recordUrl='';
      $('recordedAudio').src='';
    };

    if(session){
      Realtime.watchAlerts(session,payload=>{
        if(payload?.active) play();
        else stopPhoneAlert();
      });
    }
  }
})();
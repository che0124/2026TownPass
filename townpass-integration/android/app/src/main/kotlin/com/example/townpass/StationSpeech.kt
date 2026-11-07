package com.example.townpass

import android.content.Context
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.util.Log
import java.util.Locale

/** Device-only speech. No network-required voice is selected. */
class StationSpeech(private val context: Context) {
    private var engine: TextToSpeech? = null
    private var ready: Boolean? = null
    private var generation = 0
    private val waiting = mutableListOf<(Boolean) -> Unit>()

    private fun initialize(callback: (Boolean) -> Unit) {
        ready?.let { callback(it); return }
        waiting.add(callback)
        if (engine != null) return
        engine = TextToSpeech(context) { status ->
            ready = status == TextToSpeech.SUCCESS
            engine?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                override fun onStart(id: String?) { Log.i("StationSpeech", "started:$id") }
                override fun onDone(id: String?) { Log.i("StationSpeech", "completed:$id") }
                @Deprecated("Android callback")
                override fun onError(id: String?) { Log.w("StationSpeech", "failed:$id") }
            })
            val callbacks = waiting.toList()
            waiting.clear()
            callbacks.forEach { it(ready == true) }
        }
    }

    fun speak(text: String, tag: String, id: String, reply: (String) -> Unit) {
        val token = ++generation
        initialize { supported ->
            if (token != generation) { reply("cancelled"); return@initialize }
            val tts = engine
            if (!supported || tts == null) { reply("unavailable"); return@initialize }
            val locale = Locale.forLanguageTag(tag)
            val voice = tts.voices.orEmpty()
                .filter { it.locale.language == locale.language && !it.isNetworkConnectionRequired }
                .sortedByDescending { it.locale.country == locale.country }.firstOrNull()
            if (voice == null || tts.setVoice(voice) != TextToSpeech.SUCCESS) {
                reply("language-unavailable"); return@initialize
            }
            tts.setSpeechRate(0.95f)
            val status = tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, id)
            reply(if (status == TextToSpeech.SUCCESS) "speaking" else "unavailable")
        }
    }

    fun stop() { generation++; engine?.stop() }
    fun shutdown() { stop(); waiting.clear(); engine?.shutdown(); engine = null }
}

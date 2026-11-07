import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:town_pass/util/web_message_handler/tp_web_message_handler.dart';

class StationSpeechMessageHandler extends TPWebMessageHandler {
  static const _channel = MethodChannel('townpass/station_speech');
  @override
  String get name => 'station_speech';

  @override
  Future<void> handle({
    required Object? message,
    required WebUri? sourceOrigin,
    required bool isMainFrame,
    required Function(WebMessage replyWebMessage)? onReply,
  }) async {
    final origin = Uri.tryParse(sourceOrigin?.toString() ?? '');
    final trusted = origin != null &&
        ((origin.scheme == 'https' && origin.port == 443 &&
            const {'inside-ef271--townpass-preview-ylbdbbaw.web.app', 'inside-ef271.web.app'}.contains(origin.host)) ||
         (origin.scheme == 'http' && const {'localhost', '127.0.0.1', '10.0.2.2'}.contains(origin.host) &&
            const {5173, 5193}.contains(origin.port)));
    if (!isMainFrame || !trusted || message is! Map) return;
    final requestId = message['requestId'];
    void reply(String status) => onReply?.call(replyWebMessage(data: {'requestId': requestId, 'status': status}));
    if (defaultTargetPlatform != TargetPlatform.android) { reply('unavailable'); return; }
    try {
      if (message['action'] == 'stop') {
        await _channel.invokeMethod<void>('stop');
        reply('stopped');
        return;
      }
      final text = message['text'];
      final lang = message['lang'];
      if (message['action'] != 'speak' || text is! String || text.isEmpty || text.length > 600 ||
          !const {'zh-TW', 'en-US', 'id-ID'}.contains(lang)) { reply('invalid'); return; }
      final status = await _channel.invokeMethod<String>('speak', {'text': text, 'lang': lang, 'id': '$requestId'});
      reply(status ?? 'unavailable');
    } on PlatformException { reply('unavailable'); }
    on MissingPluginException { reply('unavailable'); }
  }
}

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(RNSmartFilePicker, NSObject)

RCT_EXTERN_METHOD(performAction:(NSString *)action
                  options:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end


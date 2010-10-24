#!/bin/sh

# You need Flex 4 SDK:
# http://opensource.adobe.com/wiki/display/flexsdk/Download+Flex+4

mxmlc -static-link-runtime-shared-libraries -optimize=false -omit-trace-statements=false -output=../flash.swf WebSocketMainInsecure.as

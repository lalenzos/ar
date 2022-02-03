from flask import json
from flask.wrappers import Request
from transformers import RobertaTokenizer, T5ForConditionalGeneration
import os
import time
import onnxruntime
import torch

class CodeSummaryController:
    
    def turn_model_into_encoder_decoder(model):
        encoder = model.encoder
        decoder = model.decoder
        lm_head = model.lm_head

        decoder_with_lm_head = CombinedDecoder(decoder, lm_head, model.config)
        simplified_encoder = SimplifiedT5Encoder(encoder)

        return simplified_encoder, decoder_with_lm_head

    def get_summary(self, request: Request):
        if not request.data:
            return None

        data = json.loads(request.data)
        text = data.get("content", "")
        if not text:
            return None
            
        tokenizer = RobertaTokenizer.from_pretrained("Salesforce/codet5-base-multi-sum")
        model = T5ForConditionalGeneration.from_pretrained("Salesforce/codet5-base-multi-sum")

        start = time.time()
        input_ids = tokenizer(text, return_tensors="pt").input_ids
        generated_ids = model.generate(input_ids, max_length=20)
        result = tokenizer.decode(generated_ids[0], skip_special_tokens=True)
        latency = time.time() - start
        print("Inference time = {} ms".format(latency * 1000, '.2f'))


        output_dir = "onnx_models"
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)   
        export_model_path = os.path.join(output_dir, 'codet5-base-multi-sum.onnx')
        if not os.path.exists(export_model_path):
            simplified_encoder, decoder_with_lm_head = self.turn_model_into_encoder_decoder(model)
            torch.onnx.export(
                model, 
                (input_ids, simplified_encoder(input_ids)),
                export_model_path,
                export_params=True,
                input_names=['input_ids'],
                output_names=['generated_ids'],
                dynamic_axes={
                    'input_ids': {0:'batch', 1: 'sequence'},
                    'generated_ids': {0:'batch', 1: 'sequence'},
                })

        sess_options = onnxruntime.SessionOptions()
        sess_options.optimized_model_filepath = os.path.join(output_dir, "codet5-base-multi-sum_model_cpu.onnx")
        session = onnxruntime.InferenceSession(export_model_path, sess_options, providers=['CPUExecutionProvider'])
        start = time.time()
        ort_outputs = session.run(None, text)
        latency = time.time() - start
        print("Inference time = {} ms".format(latency * 1000, '.2f'))

        return {"result": result}


class CombinedDecoder(torch.nn.Module):
    """ Creation of a class to combine the decoder and the lm head """
    def __init__(self, decoder, lm_head, config):
        super().__init__()
        self.decoder = decoder
        self.lm_head = lm_head
        self.config = config
    def forward(self, input_ids, encoder_hidden_states):
        decoder_output = self.decoder(input_ids=input_ids, encoder_hidden_states=encoder_hidden_states)[0] * \
                         (self.config.d_model ** -0.5)
        return self.lm_head(decoder_output)

class SimplifiedT5Encoder(torch.nn.Module):
    """ Creation of a class to output only the last hidden state from the encoder """
    def __init__(self, encoder):
        super().__init__()
        self.encoder = encoder
    def forward(self, *input, **kwargs):
        return self.encoder(*input, **kwargs)[0]
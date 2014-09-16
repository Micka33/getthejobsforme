require 'elasticsearch/persistence'

module Elasticsearch
    module Model
        module Populate
            extend ActiveSupport::Concern

            module ClassMethods

                def populate!
                    if ::Rails.env.test?
                        json = JSON.parse(IO.read("rmn.json").force_encoding('UTF-8'))
                        client = Elasticsearch::Persistence.client

                        type = self.document_type.pluralize
                        if json[0][type]
                            client.bulk index: self.index_name, type: self.document_type,
                                body: json[0][type].map { |obj|
                                    obj["sid"] = Array(obj["sid"]) if self.document_type == 'resource'
                                    { index: { _id: obj['_id'], data: obj } }
                                    }.as_json,
                                refresh: true
                        end
                    end
                end
            end
        end
    end
end